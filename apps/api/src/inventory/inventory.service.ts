import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateOpeningStockDto,
  CreateStockAdjustmentDto,
  CreateStockCountDto,
  CreateStockTransferDto,
  ImportInventoryDto
} from "./dto/create-opening-stock.dto";

const STOCK_MANAGED_TYPES = new Set(["stock", "consumable"]);
type InventoryTx = Prisma.TransactionClient;
type InventoryImportTarget = ImportInventoryDto["target"];
type InventoryImportPreviewRow = {
  rowNumber: number;
  source: Record<string, string>;
  normalized: Record<string, string>;
  errors: string[];
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  stockBalances(companyId: string) {
    return this.prisma.stockBalance.findMany({
      where: { companyId },
      orderBy: [{ item: { code: "asc" } }, { warehouse: { code: "asc" } }],
      include: {
        item: {
          select: {
            id: true,
            code: true,
            name: true,
            itemType: true,
            unitOfMeasure: { select: { code: true, name: true } }
          }
        },
        warehouse: { select: { id: true, code: true, name: true } }
      }
    });
  }

  openingStockEntries(companyId: string) {
    return this.prisma.stockLedgerEntry.findMany({
      where: { companyId, sourceType: "OPENING_STOCK" },
      orderBy: { postedAt: "desc" },
      take: 100,
      include: this.ledgerInclude()
    });
  }

  stockLedger(companyId: string) {
    return this.prisma.stockLedgerEntry.findMany({
      where: { companyId },
      orderBy: { postedAt: "desc" },
      take: 200,
      include: this.ledgerInclude()
    });
  }

  stockTransfers(companyId: string) {
    return this.prisma.stockTransfer.findMany({
      where: { companyId },
      orderBy: { postedAt: "desc" },
      take: 100,
      include: {
        item: { select: { id: true, code: true, name: true } },
        fromWarehouse: { select: { id: true, code: true, name: true } },
        toWarehouse: { select: { id: true, code: true, name: true } },
        postedBy: { select: { displayName: true, email: true } }
      }
    });
  }

  stockCounts(companyId: string) {
    return this.prisma.stockCount.findMany({
      where: { companyId },
      orderBy: { countedAt: "desc" },
      take: 100,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        postedBy: { select: { displayName: true, email: true } },
        lines: {
          include: { item: { select: { id: true, code: true, name: true } } },
          orderBy: { item: { code: "asc" } }
        }
      }
    });
  }

  stockAdjustments(companyId: string) {
    return this.prisma.stockAdjustment.findMany({
      where: { companyId },
      orderBy: { postedAt: "desc" },
      take: 100,
      include: {
        warehouse: { select: { id: true, code: true, name: true } },
        postedBy: { select: { displayName: true, email: true } },
        lines: {
          include: { item: { select: { id: true, code: true, name: true } } },
          orderBy: { item: { code: "asc" } }
        }
      }
    });
  }

  async valuation(companyId: string) {
    const balances = await this.stockBalances(companyId);
    const rows = balances.map((balance) => {
      const quantityOnHand = Number(balance.quantityOnHand);
      const averageCost = Number(balance.averageCost);
      return {
        id: balance.id,
        item: balance.item,
        warehouse: balance.warehouse,
        quantityOnHand: this.decimalText(quantityOnHand),
        averageCost: this.decimalText(averageCost),
        valuationAmount: this.decimalText(quantityOnHand * averageCost)
      };
    });

    return {
      totalValue: this.decimalText(rows.reduce((sum, row) => sum + Number(row.valuationAmount), 0)),
      rows
    };
  }

  async previewImport(companyId: string, dto: ImportInventoryDto) {
    const rows = dto.rows.slice(0, 500);
    const [items, warehouses] = await Promise.all([
      this.prisma.item.findMany({ where: { companyId } }),
      this.prisma.warehouse.findMany({ where: { companyId } })
    ]);
    const itemByCode = new Map(items.map((item) => [item.code.trim().toUpperCase(), item]));
    const warehouseByCode = new Map(warehouses.map((warehouse) => [warehouse.code.trim().toUpperCase(), warehouse]));
    const countKeys = new Map<string, number>();

    const previewRows = rows.map((row, index) => {
      const preview = this.mapInventoryImportRow(dto.target, dto.mapping, row, index + 2);
      const item = itemByCode.get(String(preview.normalized.itemCode ?? "").toUpperCase());
      const warehouse = warehouseByCode.get(String(preview.normalized.warehouseCode ?? "").toUpperCase());

      if (!item) {
        preview.errors.push("Item code was not found.");
      } else {
        preview.normalized.itemId = item.id;
        preview.normalized.itemName = item.name;
        if (!item.isActive) preview.errors.push("Item is inactive.");
        if (!STOCK_MANAGED_TYPES.has(item.itemType.trim().toLowerCase())) preview.errors.push("Item is not stock-managed.");
      }

      if (dto.target === "transfers") {
        const fromWarehouse = warehouseByCode.get(String(preview.normalized.fromWarehouseCode ?? "").toUpperCase());
        const toWarehouse = warehouseByCode.get(String(preview.normalized.toWarehouseCode ?? "").toUpperCase());
        if (!fromWarehouse) {
          preview.errors.push("From warehouse code was not found.");
        } else {
          preview.normalized.fromWarehouseId = fromWarehouse.id;
          if (!fromWarehouse.isActive) preview.errors.push("From warehouse is inactive.");
        }
        if (!toWarehouse) {
          preview.errors.push("To warehouse code was not found.");
        } else {
          preview.normalized.toWarehouseId = toWarehouse.id;
          if (!toWarehouse.isActive) preview.errors.push("To warehouse is inactive.");
        }
        if (fromWarehouse && toWarehouse && fromWarehouse.id === toWarehouse.id) preview.errors.push("From and to warehouses must be different.");
        this.validateImportDecimal(preview, "quantity", true);
      } else {
        if (!warehouse) {
          preview.errors.push("Warehouse code was not found.");
        } else {
          preview.normalized.warehouseId = warehouse.id;
          if (!warehouse.isActive) preview.errors.push("Warehouse is inactive.");
        }

        if (dto.target === "counts") {
          this.validateImportDecimal(preview, "countedQuantity", false);
          if (item && warehouse) {
            const key = `${warehouse.id}:${item.id}`;
            const firstRow = countKeys.get(key);
            if (firstRow) {
              preview.errors.push(`Duplicate count line for item and warehouse. First seen on row ${firstRow}.`);
            } else {
              countKeys.set(key, preview.rowNumber);
            }
          }
        } else {
          this.validateImportDecimal(preview, "quantity", true);
          if (preview.normalized.unitCost) this.validateImportDecimal(preview, "unitCost", false);
          const movementType = this.normalizeMovementType(preview.normalized.movementType);
          if (!movementType) {
            preview.errors.push("Movement type must be IN or OUT.");
          } else {
            preview.normalized.movementType = movementType;
          }
          if (!preview.normalized.reason) preview.normalized.reason = "Bulk import adjustment";
        }
      }

      return preview;
    });

    const validRows = previewRows.filter((row) => row.errors.length === 0);
    return {
      target: dto.target,
      totalRows: previewRows.length,
      validRows: validRows.length,
      invalidRows: previewRows.length - validRows.length,
      rows: previewRows
    };
  }

  async commitImport(companyId: string, userId: string, dto: ImportInventoryDto) {
    const preview = await this.previewImport(companyId, dto);
    const validRows = preview.rows.filter((row) => row.errors.length === 0);
    const created: unknown[] = [];

    if (dto.target === "transfers") {
      for (const row of validRows) {
        created.push(
          await this.createStockTransfer(companyId, userId, {
            itemId: row.normalized.itemId,
            fromWarehouseId: row.normalized.fromWarehouseId,
            toWarehouseId: row.normalized.toWarehouseId,
            quantity: row.normalized.quantity,
            remarks: row.normalized.remarks || undefined
          })
        );
      }
    } else if (dto.target === "counts") {
      const grouped = new Map<string, InventoryImportPreviewRow[]>();
      for (const row of validRows) {
        const current = grouped.get(row.normalized.warehouseId) ?? [];
        current.push(row);
        grouped.set(row.normalized.warehouseId, current);
      }

      for (const [warehouseId, groupRows] of grouped) {
        created.push(
          await this.createStockCount(companyId, userId, {
            warehouseId,
            remarks: "Bulk import stock count",
            lines: groupRows.map((row) => ({
              itemId: row.normalized.itemId,
              countedQuantity: row.normalized.countedQuantity,
              remarks: row.normalized.remarks || undefined
            }))
          })
        );
      }
    } else {
      const grouped = new Map<string, InventoryImportPreviewRow[]>();
      for (const row of validRows) {
        const key = `${row.normalized.warehouseId}:${row.normalized.reason}`;
        const current = grouped.get(key) ?? [];
        current.push(row);
        grouped.set(key, current);
      }

      for (const groupRows of grouped.values()) {
        created.push(
          await this.createStockAdjustment(companyId, userId, {
            warehouseId: groupRows[0].normalized.warehouseId,
            reason: groupRows[0].normalized.reason,
            remarks: "Bulk import stock adjustment",
            lines: groupRows.map((row) => ({
              itemId: row.normalized.itemId,
              movementType: row.normalized.movementType,
              quantity: row.normalized.quantity,
              unitCost: row.normalized.unitCost || undefined,
              remarks: row.normalized.remarks || undefined
            }))
          })
        );
      }
    }

    await this.audit.record({
      companyId,
      userId,
      action: "inventory_import",
      module: "inventory",
      recordType: dto.target,
      afterValue: {
        target: dto.target,
        importedRows: validRows.length,
        createdDocuments: created.length,
        rejectedRows: preview.invalidRows
      }
    });

    return {
      ...preview,
      importedRows: validRows.length,
      createdDocuments: created.length
    };
  }

  async createOpeningStock(companyId: string, userId: string, dto: CreateOpeningStockDto) {
    const quantity = this.parsePositiveDecimal(dto.quantity, "quantity");
    const unitCost = this.parseNonNegativeDecimal(dto.unitCost ?? "0", "unitCost");
    const quantityText = this.decimalText(quantity);
    const unitCostText = this.decimalText(unitCost);
    const valuationText = this.decimalText(quantity * unitCost);

    const [item, warehouse] = await Promise.all([
      this.prisma.item.findFirst({
        where: { id: dto.itemId, companyId },
        include: { unitOfMeasure: true }
      }),
      this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, companyId } })
    ]);

    this.assertStockItem(item, "Item was not found");
    this.assertWarehouse(warehouse, "Warehouse was not found");
    if (!item.unitOfMeasureId || !item.unitOfMeasure?.isActive) {
      throw new BadRequestException("Item must have an active unit of measure before opening stock can be posted");
    }

    const existingMovements = await this.prisma.stockLedgerEntry.count({
      where: { companyId, itemId: item.id, warehouseId: warehouse.id }
    });
    if (existingMovements > 0) {
      throw new BadRequestException("Opening stock must be posted before any other stock movement for this item and warehouse");
    }

    const sourceDocumentId = `OPEN-${item.code}-${warehouse.code}`;
    const created = await this.prisma.$transaction(async (tx) => {
      const balance = await tx.stockBalance.upsert({
        where: {
          companyId_itemId_warehouseId: {
            companyId,
            itemId: item.id,
            warehouseId: warehouse.id
          }
        },
        update: {
          quantityOnHand: quantityText,
          averageCost: unitCostText
        },
        create: {
          companyId,
          itemId: item.id,
          warehouseId: warehouse.id,
          quantityOnHand: quantityText,
          averageCost: unitCostText
        }
      });

      return tx.stockLedgerEntry.create({
        data: {
          companyId,
          itemId: item.id,
          warehouseId: warehouse.id,
          movementType: "IN",
          sourceType: "OPENING_STOCK",
          sourceDocumentId,
          quantityIn: quantityText,
          quantityOut: "0",
          unitCost: unitCostText,
          valuationAmount: valuationText,
          balanceAfter: String(balance.quantityOnHand),
          remarks: dto.remarks?.trim() || undefined,
          postedById: userId
        },
        include: this.ledgerInclude()
      });
    });

    await this.audit.record({
      companyId,
      userId,
      action: "opening_stock",
      module: "inventory",
      recordType: "StockLedgerEntry",
      recordId: created.id,
      afterValue: created
    });

    return created;
  }

  async createStockTransfer(companyId: string, userId: string, dto: CreateStockTransferDto) {
    const quantity = this.parsePositiveDecimal(dto.quantity, "quantity");
    if (dto.fromWarehouseId === dto.toWarehouseId) throw new BadRequestException("Transfer warehouses must be different");

    const [item, fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.item.findFirst({ where: { id: dto.itemId, companyId } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.fromWarehouseId, companyId } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.toWarehouseId, companyId } })
    ]);
    this.assertStockItem(item, "Item was not found");
    this.assertWarehouse(fromWarehouse, "Source warehouse was not found");
    this.assertWarehouse(toWarehouse, "Destination warehouse was not found");

    const transfer = await this.prisma.$transaction(async (tx) => {
      const transferNo = await this.nextDocumentNo(tx, companyId, "stockTransfer", "ST");
      const sourceBalance = await this.getBalanceOrThrow(tx, companyId, item.id, fromWarehouse.id, `Insufficient stock for ${item.code}`);
      const unitCost = Number(sourceBalance.averageCost);

      const created = await tx.stockTransfer.create({
        data: {
          companyId,
          transferNo,
          itemId: item.id,
          fromWarehouseId: fromWarehouse.id,
          toWarehouseId: toWarehouse.id,
          quantity: this.decimalText(quantity),
          unitCost: this.decimalText(unitCost),
          valuationAmount: this.decimalText(quantity * unitCost),
          remarks: dto.remarks?.trim() || undefined,
          postedById: userId
        }
      });

      await this.postStockMovement(tx, {
        companyId,
        itemId: item.id,
        warehouseId: fromWarehouse.id,
        movementType: "OUT",
        sourceType: "STOCK_TRANSFER",
        sourceDocumentId: transferNo,
        quantity,
        unitCost,
        remarks: dto.remarks?.trim() || `Transfer to ${toWarehouse.code}`,
        postedById: userId
      });
      await this.postStockMovement(tx, {
        companyId,
        itemId: item.id,
        warehouseId: toWarehouse.id,
        movementType: "IN",
        sourceType: "STOCK_TRANSFER",
        sourceDocumentId: transferNo,
        quantity,
        unitCost,
        remarks: dto.remarks?.trim() || `Transfer from ${fromWarehouse.code}`,
        postedById: userId
      });

      return tx.stockTransfer.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          item: { select: { id: true, code: true, name: true } },
          fromWarehouse: { select: { id: true, code: true, name: true } },
          toWarehouse: { select: { id: true, code: true, name: true } }
        }
      });
    });

    await this.audit.record({
      companyId,
      userId,
      action: "stock_transfer",
      module: "inventory",
      recordType: "StockTransfer",
      recordId: transfer.id,
      afterValue: transfer
    });

    return transfer;
  }

  async createStockCount(companyId: string, userId: string, dto: CreateStockCountDto) {
    this.assertLines(dto.lines);
    const countedAt = dto.countedAt ? new Date(dto.countedAt) : new Date();
    if (Number.isNaN(countedAt.getTime())) throw new BadRequestException("countedAt must be a valid date");

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, companyId } });
    this.assertWarehouse(warehouse, "Warehouse was not found");

    const itemIds = this.uniqueLineItemIds(dto.lines.map((line) => line.itemId));
    const items = await this.prisma.item.findMany({ where: { companyId, id: { in: itemIds } } });
    const itemById = new Map(items.map((item) => [item.id, item]));
    for (const itemId of itemIds) this.assertStockItem(itemById.get(itemId) ?? null, "Count line item was not found");

    const created = await this.prisma.$transaction(async (tx) => {
      const countNo = await this.nextDocumentNo(tx, companyId, "stockCount", "SC");
      const count = await tx.stockCount.create({
        data: {
          companyId,
          countNo,
          warehouseId: warehouse.id,
          countedAt,
          remarks: dto.remarks?.trim() || undefined,
          postedById: userId
        }
      });

      for (const line of dto.lines) {
        const countedQuantity = this.parseNonNegativeDecimal(line.countedQuantity, "countedQuantity");
        const balance = await tx.stockBalance.findUnique({
          where: { companyId_itemId_warehouseId: { companyId, itemId: line.itemId, warehouseId: warehouse.id } }
        });
        const systemQuantity = Number(balance?.quantityOnHand ?? 0);
        const unitCost = Number(balance?.averageCost ?? itemById.get(line.itemId)?.purchasePrice ?? 0);
        const varianceQuantity = countedQuantity - systemQuantity;

        await tx.stockCountLine.create({
          data: {
            stockCountId: count.id,
            itemId: line.itemId,
            systemQuantity: this.decimalText(systemQuantity),
            countedQuantity: this.decimalText(countedQuantity),
            varianceQuantity: this.decimalText(varianceQuantity),
            unitCost: this.decimalText(unitCost),
            valuationAmount: this.decimalText(Math.abs(varianceQuantity) * unitCost),
            remarks: line.remarks?.trim() || undefined
          }
        });

        if (varianceQuantity !== 0) {
          await this.postStockMovement(tx, {
            companyId,
            itemId: line.itemId,
            warehouseId: warehouse.id,
            movementType: varianceQuantity > 0 ? "IN" : "OUT",
            sourceType: "STOCK_COUNT",
            sourceDocumentId: countNo,
            quantity: Math.abs(varianceQuantity),
            unitCost,
            remarks: line.remarks?.trim() || "Stock count variance",
            postedById: userId
          });
        }
      }

      return tx.stockCount.findUniqueOrThrow({
        where: { id: count.id },
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          lines: { include: { item: { select: { id: true, code: true, name: true } } } }
        }
      });
    });

    await this.audit.record({
      companyId,
      userId,
      action: "stock_count",
      module: "inventory",
      recordType: "StockCount",
      recordId: created.id,
      afterValue: created
    });

    return created;
  }

  async createStockAdjustment(companyId: string, userId: string, dto: CreateStockAdjustmentDto) {
    this.assertLines(dto.lines);
    if (!dto.reason.trim()) throw new BadRequestException("reason is required");

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, companyId } });
    this.assertWarehouse(warehouse, "Warehouse was not found");

    const itemIds = this.uniqueLineItemIds(dto.lines.map((line) => line.itemId));
    const items = await this.prisma.item.findMany({ where: { companyId, id: { in: itemIds } } });
    const itemById = new Map(items.map((item) => [item.id, item]));
    for (const itemId of itemIds) this.assertStockItem(itemById.get(itemId) ?? null, "Adjustment line item was not found");

    const created = await this.prisma.$transaction(async (tx) => {
      const adjustmentNo = await this.nextDocumentNo(tx, companyId, "stockAdjustment", "SA");
      const adjustment = await tx.stockAdjustment.create({
        data: {
          companyId,
          adjustmentNo,
          warehouseId: warehouse.id,
          reason: dto.reason.trim(),
          remarks: dto.remarks?.trim() || undefined,
          postedById: userId
        }
      });

      for (const line of dto.lines) {
        if (line.movementType !== "IN" && line.movementType !== "OUT") throw new BadRequestException("movementType must be IN or OUT");
        const movementType = line.movementType;
        const quantity = this.parsePositiveDecimal(line.quantity, "quantity");
        const balance = await tx.stockBalance.findUnique({
          where: { companyId_itemId_warehouseId: { companyId, itemId: line.itemId, warehouseId: warehouse.id } }
        });
        const unitCost = line.unitCost
          ? this.parseNonNegativeDecimal(line.unitCost, "unitCost")
          : Number(balance?.averageCost ?? itemById.get(line.itemId)?.purchasePrice ?? 0);

        await tx.stockAdjustmentLine.create({
          data: {
            stockAdjustmentId: adjustment.id,
            itemId: line.itemId,
            movementType,
            quantity: this.decimalText(quantity),
            unitCost: this.decimalText(unitCost),
            valuationAmount: this.decimalText(quantity * unitCost),
            remarks: line.remarks?.trim() || undefined
          }
        });

        await this.postStockMovement(tx, {
          companyId,
          itemId: line.itemId,
          warehouseId: warehouse.id,
          movementType,
          sourceType: "STOCK_ADJUSTMENT",
          sourceDocumentId: adjustmentNo,
          quantity,
          unitCost,
          remarks: line.remarks?.trim() || dto.reason.trim(),
          postedById: userId
        });
      }

      return tx.stockAdjustment.findUniqueOrThrow({
        where: { id: adjustment.id },
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          lines: { include: { item: { select: { id: true, code: true, name: true } } } }
        }
      });
    });

    await this.audit.record({
      companyId,
      userId,
      action: "stock_adjustment",
      module: "inventory",
      recordType: "StockAdjustment",
      recordId: created.id,
      afterValue: created
    });

    return created;
  }

  private mapInventoryImportRow(target: InventoryImportTarget, mapping: Record<string, string>, row: Record<string, unknown>, rowNumber: number): InventoryImportPreviewRow {
    const normalized: Record<string, string> = {};
    const fields =
      target === "transfers"
        ? ["itemCode", "fromWarehouseCode", "toWarehouseCode", "quantity", "remarks"]
        : target === "counts"
          ? ["itemCode", "warehouseCode", "countedQuantity", "remarks"]
          : ["itemCode", "warehouseCode", "movementType", "quantity", "unitCost", "reason", "remarks"];

    for (const field of fields) {
      normalized[field] = this.cleanImportValue(row[mapping[field] ?? ""]);
    }

    if (!normalized.itemCode) normalized.itemCode = this.cleanImportValue(row["itemCode"] ?? row["Item Code"] ?? row["Item"]);
    if (target === "transfers") {
      if (!normalized.fromWarehouseCode) normalized.fromWarehouseCode = this.cleanImportValue(row["fromWarehouseCode"] ?? row["From Warehouse"] ?? row["From Warehouse Code"]);
      if (!normalized.toWarehouseCode) normalized.toWarehouseCode = this.cleanImportValue(row["toWarehouseCode"] ?? row["To Warehouse"] ?? row["To Warehouse Code"]);
      if (!normalized.quantity) normalized.quantity = this.cleanImportValue(row["quantity"] ?? row["Quantity"]);
    } else {
      if (!normalized.warehouseCode) normalized.warehouseCode = this.cleanImportValue(row["warehouseCode"] ?? row["Warehouse"] ?? row["Warehouse Code"]);
      if (target === "counts") {
        if (!normalized.countedQuantity) normalized.countedQuantity = this.cleanImportValue(row["countedQuantity"] ?? row["Counted Quantity"] ?? row["Quantity"]);
      } else {
        if (!normalized.movementType) normalized.movementType = this.cleanImportValue(row["movementType"] ?? row["Movement Type"] ?? row["Direction"]);
        if (!normalized.quantity) normalized.quantity = this.cleanImportValue(row["quantity"] ?? row["Quantity"]);
        if (!normalized.unitCost) normalized.unitCost = this.cleanImportValue(row["unitCost"] ?? row["Unit Cost"]);
        if (!normalized.reason) normalized.reason = this.cleanImportValue(row["reason"] ?? row["Reason"]);
      }
    }
    if (!normalized.remarks) normalized.remarks = this.cleanImportValue(row["remarks"] ?? row["Remarks"] ?? row["Notes"]);

    const required =
      target === "transfers"
        ? ["itemCode", "fromWarehouseCode", "toWarehouseCode", "quantity"]
        : target === "counts"
          ? ["itemCode", "warehouseCode", "countedQuantity"]
          : ["itemCode", "warehouseCode", "movementType", "quantity"];

    return {
      rowNumber,
      source: Object.fromEntries(Object.entries(row).map(([key, value]) => [key, this.cleanImportValue(value)])),
      normalized,
      errors: required.filter((field) => !normalized[field]).map((field) => `${field} is required.`)
    };
  }

  private validateImportDecimal(row: InventoryImportPreviewRow, field: string, positive: boolean) {
    const value = row.normalized[field];
    if (!value) return;
    if (!/^\d+(\.\d{1,4})?$/.test(value.trim())) {
      row.errors.push(`${field} must be a number with up to 4 decimals.`);
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || (positive && parsed <= 0)) {
      row.errors.push(`${field} must be ${positive ? "greater than zero" : "zero or greater"}.`);
    }
  }

  private normalizeMovementType(value: string) {
    const normalized = value.trim().toUpperCase();
    if (["IN", "STOCK IN", "STOCK_IN", "+", "PLUS"].includes(normalized)) return "IN";
    if (["OUT", "STOCK OUT", "STOCK_OUT", "-", "MINUS"].includes(normalized)) return "OUT";
    return "";
  }

  private cleanImportValue(value: unknown) {
    return String(value ?? "").trim();
  }

  private async postStockMovement(
    tx: InventoryTx,
    params: {
      companyId: string;
      itemId: string;
      warehouseId: string;
      movementType: "IN" | "OUT";
      sourceType: string;
      sourceDocumentId: string;
      quantity: number;
      unitCost: number;
      remarks?: string;
      postedById: string;
    }
  ) {
    const existing = await tx.stockBalance.findUnique({
      where: { companyId_itemId_warehouseId: { companyId: params.companyId, itemId: params.itemId, warehouseId: params.warehouseId } }
    });
    const currentQuantity = Number(existing?.quantityOnHand ?? 0);
    const currentAverage = Number(existing?.averageCost ?? params.unitCost);
    if (params.movementType === "OUT" && currentQuantity < params.quantity) {
      throw new BadRequestException("Insufficient stock for inventory movement");
    }

    const nextQuantity = params.movementType === "IN" ? currentQuantity + params.quantity : currentQuantity - params.quantity;
    const nextAverage =
      params.movementType === "IN" && nextQuantity > 0
        ? (currentQuantity * currentAverage + params.quantity * params.unitCost) / nextQuantity
        : currentAverage;
    const valuationAmount = params.quantity * (params.movementType === "OUT" ? currentAverage : params.unitCost);

    const balance = await tx.stockBalance.upsert({
      where: { companyId_itemId_warehouseId: { companyId: params.companyId, itemId: params.itemId, warehouseId: params.warehouseId } },
      update: {
        quantityOnHand: this.decimalText(nextQuantity),
        averageCost: this.decimalText(nextAverage)
      },
      create: {
        companyId: params.companyId,
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        quantityOnHand: this.decimalText(nextQuantity),
        averageCost: this.decimalText(nextAverage)
      }
    });

    await tx.stockLedgerEntry.create({
      data: {
        companyId: params.companyId,
        itemId: params.itemId,
        warehouseId: params.warehouseId,
        movementType: params.movementType,
        sourceType: params.sourceType,
        sourceDocumentId: params.sourceDocumentId,
        quantityIn: params.movementType === "IN" ? this.decimalText(params.quantity) : "0",
        quantityOut: params.movementType === "OUT" ? this.decimalText(params.quantity) : "0",
        unitCost: this.decimalText(params.movementType === "OUT" ? currentAverage : params.unitCost),
        valuationAmount: this.decimalText(valuationAmount),
        balanceAfter: String(balance.quantityOnHand),
        remarks: params.remarks || undefined,
        postedById: params.postedById
      }
    });

    return balance;
  }

  private async getBalanceOrThrow(tx: InventoryTx, companyId: string, itemId: string, warehouseId: string, message: string) {
    const balance = await tx.stockBalance.findUnique({ where: { companyId_itemId_warehouseId: { companyId, itemId, warehouseId } } });
    if (!balance || Number(balance.quantityOnHand) <= 0) throw new BadRequestException(message);
    return balance;
  }

  private async nextDocumentNo(tx: InventoryTx, companyId: string, model: "stockTransfer" | "stockCount" | "stockAdjustment", prefix: string) {
    const count =
      model === "stockTransfer"
        ? await tx.stockTransfer.count({ where: { companyId } })
        : model === "stockCount"
          ? await tx.stockCount.count({ where: { companyId } })
          : await tx.stockAdjustment.count({ where: { companyId } });
    return `${prefix}-${String(count + 1).padStart(5, "0")}`;
  }

  private assertLines(lines?: unknown[]) {
    if (!lines?.length) throw new BadRequestException("At least one line is required");
  }

  private uniqueLineItemIds(itemIds: string[]) {
    const unique = [...new Set(itemIds)];
    if (unique.length !== itemIds.length) throw new BadRequestException("Duplicate item lines are not allowed");
    return unique;
  }

  private assertStockItem<T extends { id: string; code: string; itemType: string; isActive: boolean } | null>(item: T, notFoundMessage: string): asserts item is NonNullable<T> {
    if (!item) throw new BadRequestException(notFoundMessage);
    if (!item.isActive) throw new BadRequestException("Inventory movement can only be posted for active items");
    if (!STOCK_MANAGED_TYPES.has(item.itemType.trim().toLowerCase())) {
      throw new BadRequestException("Inventory movement is only allowed for Stock or Consumable items");
    }
  }

  private assertWarehouse<T extends { id: string; code: string; isActive: boolean } | null>(warehouse: T, notFoundMessage: string): asserts warehouse is NonNullable<T> {
    if (!warehouse) throw new BadRequestException(notFoundMessage);
    if (!warehouse.isActive) throw new BadRequestException("Warehouse must be active");
  }

  private parsePositiveDecimal(value: string, field: string) {
    const parsed = this.parseNonNegativeDecimal(value, field);
    if (parsed <= 0) throw new BadRequestException(`${field} must be greater than zero`);
    return parsed;
  }

  private parseNonNegativeDecimal(value: string, field: string) {
    if (!/^\d+(\.\d{1,4})?$/.test(value.trim())) {
      throw new BadRequestException(`${field} must be a non-negative number with up to 4 decimals`);
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a non-negative number`);
    }
    return parsed;
  }

  private decimalText(value: number) {
    return value.toFixed(4).replace(/\.?0+$/, "");
  }

  private ledgerInclude() {
    return {
      item: {
        select: {
          id: true,
          code: true,
          name: true,
          unitOfMeasure: { select: { code: true, name: true } }
        }
      },
      warehouse: { select: { id: true, code: true, name: true } },
      postedBy: { select: { displayName: true, email: true } }
    };
  }
}
