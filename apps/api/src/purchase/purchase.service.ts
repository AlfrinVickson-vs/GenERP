import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreatePurchaseRequestDto,
  CreatePurchaseReturnDto,
  CreateRfqDto,
  CreateSupplierInvoiceDto,
  CreateSupplierQuotationDto,
  PurchaseLineDto
} from "./dto/purchase.dto";

const STOCK_MANAGED_TYPES = new Set(["stock", "consumable"]);

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  purchaseRequests(companyId: string) {
    return this.prisma.purchaseRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { lines: { include: { item: { select: { code: true, name: true } } } }, requestedBy: { select: { displayName: true } } }
    });
  }

  rfqs(companyId: string) {
    return this.prisma.requestForQuotation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { purchaseRequest: { select: { requestNo: true } }, supplierQuotations: { select: { quoteNo: true, total: true, supplier: { select: { code: true, name: true } } } } }
    });
  }

  supplierQuotations(companyId: string) {
    return this.prisma.supplierQuotation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { supplier: { select: { code: true, name: true } }, rfq: { select: { rfqNo: true } }, lines: true }
    });
  }

  purchaseOrders(companyId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { supplier: { select: { code: true, name: true } }, lines: { include: { item: { select: { code: true, name: true } } } } }
    });
  }

  goodsReceipts(companyId: string) {
    return this.prisma.goodsReceipt.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { purchaseOrder: { select: { poNo: true } }, lines: true }
    });
  }

  supplierInvoices(companyId: string) {
    return this.prisma.supplierInvoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { supplier: { select: { code: true, name: true } }, purchaseOrder: { select: { poNo: true } }, goodsReceipt: { select: { receiptNo: true } } }
    });
  }

  purchaseReturns(companyId: string) {
    return this.prisma.purchaseReturn.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { supplier: { select: { code: true, name: true } }, purchaseOrder: { select: { poNo: true } }, lines: true }
    });
  }

  async createPurchaseRequest(companyId: string, userId: string, dto: CreatePurchaseRequestDto) {
    const lines = await this.prepareLines(companyId, dto.lines, "estimatedUnitCost");
    const request = await this.prisma.purchaseRequest.create({
      data: {
        companyId,
        requestNo: await this.nextDocumentNo(companyId, "purchaseRequest", "PR"),
        status: "SUBMITTED",
        requiredDate: this.parseOptionalDate(dto.requiredDate),
        notes: dto.notes?.trim() || undefined,
        requestedById: userId,
        lines: {
          create: lines.map((line) => ({
            itemId: line.itemId,
            description: line.description,
            quantity: line.quantity,
            estimatedUnitCost: line.unitPrice
          }))
        }
      },
      include: { lines: true }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "purchase", recordType: "PurchaseRequest", recordId: request.id, afterValue: request });
    return request;
  }

  async createRfq(companyId: string, userId: string, dto: CreateRfqDto) {
    if (dto.purchaseRequestId) await this.assertPurchaseRequest(companyId, dto.purchaseRequestId);
    const rfq = await this.prisma.requestForQuotation.create({
      data: {
        companyId,
        rfqNo: await this.nextDocumentNo(companyId, "requestForQuotation", "RFQ"),
        purchaseRequestId: dto.purchaseRequestId,
        dueDate: this.parseOptionalDate(dto.dueDate),
        notes: dto.notes?.trim() || undefined
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "purchase", recordType: "RequestForQuotation", recordId: rfq.id, afterValue: rfq });
    return rfq;
  }

  async createSupplierQuotation(companyId: string, userId: string, dto: CreateSupplierQuotationDto) {
    await this.assertSupplier(companyId, dto.supplierId);
    if (dto.rfqId) await this.assertRfq(companyId, dto.rfqId);
    const totals = await this.prepareTotals(companyId, dto.lines);
    const quote = await this.prisma.supplierQuotation.create({
      data: {
        companyId,
        quoteNo: await this.nextDocumentNo(companyId, "supplierQuotation", "SQ"),
        rfqId: dto.rfqId,
        supplierId: dto.supplierId,
        leadTimeDays: dto.leadTimeDays ? Math.max(0, Math.trunc(Number(dto.leadTimeDays))) : undefined,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        notes: dto.notes?.trim() || undefined,
        lines: { create: totals.lines }
      },
      include: { supplier: { select: { code: true, name: true } }, lines: true }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "purchase", recordType: "SupplierQuotation", recordId: quote.id, afterValue: quote });
    return quote;
  }

  async compareRfq(companyId: string, id: string) {
    const rfq = await this.prisma.requestForQuotation.findFirst({
      where: { id, companyId },
      include: { supplierQuotations: { include: { supplier: { select: { code: true, name: true } }, lines: true } } }
    });
    if (!rfq) throw new BadRequestException("RFQ was not found");
    const rows = rfq.supplierQuotations.map((quote) => ({
      id: quote.id,
      quoteNo: quote.quoteNo,
      supplier: quote.supplier,
      leadTimeDays: quote.leadTimeDays,
      lineCount: quote.lines.length,
      subtotal: String(quote.subtotal),
      taxTotal: String(quote.taxTotal),
      total: String(quote.total)
    }));
    const best = [...rows].sort((a, b) => Number(a.total) - Number(b.total))[0] ?? null;
    return { rfqNo: rfq.rfqNo, quotations: rows, best };
  }

  async createPurchaseOrder(companyId: string, userId: string, dto: CreatePurchaseOrderDto) {
    await this.assertSupplier(companyId, dto.supplierId);
    if (dto.purchaseRequestId) await this.assertPurchaseRequest(companyId, dto.purchaseRequestId);
    const quotation = dto.supplierQuotationId
      ? await this.prisma.supplierQuotation.findFirst({ where: { id: dto.supplierQuotationId, companyId }, include: { lines: true } })
      : null;
    if (dto.supplierQuotationId && !quotation) throw new BadRequestException("Supplier quotation was not found");
    const sourceLines = dto.lines ?? quotation?.lines.map((line) => ({
      itemId: line.itemId,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      taxRate: String(line.taxRate)
    }));
    if (!sourceLines?.length) throw new BadRequestException("Purchase order lines are required");
    const totals = await this.prepareTotals(companyId, sourceLines);
    const order = await this.prisma.purchaseOrder.create({
      data: {
        companyId,
        poNo: await this.nextDocumentNo(companyId, "purchaseOrder", "PO"),
        supplierId: dto.supplierId,
        purchaseRequestId: dto.purchaseRequestId,
        supplierQuotationId: dto.supplierQuotationId,
        expectedDate: this.parseOptionalDate(dto.expectedDate),
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        notes: dto.notes?.trim() || undefined,
        lines: { create: totals.lines }
      },
      include: { supplier: { select: { code: true, name: true } }, lines: true }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "purchase", recordType: "PurchaseOrder", recordId: order.id, afterValue: order });
    return order;
  }

  async createGoodsReceipt(companyId: string, userId: string, dto: CreateGoodsReceiptDto) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, companyId },
      include: { lines: { include: { item: true } } }
    });
    if (!order) throw new BadRequestException("Purchase order was not found");
    if (!["ISSUED", "PARTIALLY_RECEIVED"].includes(order.status)) throw new BadRequestException("Only issued or partially received purchase orders can be received");
    const requested = new Map((dto.lines ?? []).map((line) => [line.purchaseOrderLineId, this.parsePositiveDecimal(line.quantity, "quantity")]));
    const lines = order.lines.map((line) => {
      const remaining = Number(line.quantity) - Number(line.receivedQuantity);
      const quantity = requested.size ? requested.get(line.id) ?? 0 : remaining;
      return { line, quantity, remaining };
    }).filter((entry) => entry.quantity > 0);
    if (!lines.length) throw new BadRequestException("No receivable lines were provided");
    for (const entry of lines) {
      if (entry.quantity > entry.remaining) throw new BadRequestException(`Receipt quantity exceeds remaining quantity for ${entry.line.description}`);
    }
    const receipt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceipt.create({
        data: {
          companyId,
          receiptNo: await this.nextDocumentNo(companyId, "goodsReceipt", "GRN"),
          purchaseOrderId: order.id,
          notes: dto.notes?.trim() || undefined,
          lines: {
            create: lines.map((entry) => ({
              purchaseOrderLineId: entry.line.id,
              itemId: entry.line.itemId,
              description: entry.line.description,
              quantity: this.decimalText(entry.quantity),
              unitCost: String(entry.line.unitPrice)
            }))
          }
        },
        include: { lines: true, purchaseOrder: { select: { poNo: true } } }
      });

      for (const entry of lines) {
        await tx.purchaseOrderLine.update({
          where: { id: entry.line.id },
          data: { receivedQuantity: this.decimalText(Number(entry.line.receivedQuantity) + entry.quantity) }
        });
        await this.postStockMovement(tx, {
          companyId,
          item: entry.line.item,
          quantity: entry.quantity,
          unitCost: Number(entry.line.unitPrice),
          movementType: "IN",
          sourceType: "GOODS_RECEIPT",
          sourceDocumentId: created.receiptNo,
          remarks: `Goods receipt for ${order.poNo}`,
          userId
        });
      }

      const received = order.lines.reduce((sum, line) => sum + Number(line.receivedQuantity) + (lines.find((entry) => entry.line.id === line.id)?.quantity ?? 0), 0);
      const ordered = order.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: received >= ordered ? "RECEIVED" : "PARTIALLY_RECEIVED" } });
      return created;
    });
    await this.audit.record({ companyId, userId, action: "post_goods_receipt", module: "purchase", recordType: "GoodsReceipt", recordId: receipt.id, afterValue: receipt });
    return receipt;
  }

  async createSupplierInvoice(companyId: string, userId: string, dto: CreateSupplierInvoiceDto) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, companyId },
      include: { supplier: true, lines: true, goodsReceipts: { include: { lines: true } } }
    });
    if (!order) throw new BadRequestException("Purchase order was not found");
    if (await this.prisma.supplierInvoice.findFirst({ where: { companyId, supplierId: order.supplierId, supplierInvoiceNo: dto.supplierInvoiceNo } })) {
      throw new BadRequestException("Duplicate supplier invoice number for this supplier");
    }
    if (dto.goodsReceiptId) {
      const receipt = order.goodsReceipts.find((entry) => entry.id === dto.goodsReceiptId);
      if (!receipt) throw new BadRequestException("Goods receipt does not belong to the purchase order");
    }
    const subtotal = this.parseNonNegativeDecimal(dto.subtotal, "subtotal");
    const taxTotal = this.parseNonNegativeDecimal(dto.taxTotal ?? "0", "taxTotal");
    const total = subtotal + taxTotal;
    const receivedQuantity = order.goodsReceipts
      .filter((receipt) => !dto.goodsReceiptId || receipt.id === dto.goodsReceiptId)
      .flatMap((receipt) => receipt.lines)
      .reduce((sum, line) => sum + Number(line.quantity), 0);
    const orderedQuantity = order.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const variances = {
      quantityVariance: dto.goodsReceiptId ? receivedQuantity < orderedQuantity : order.status !== "RECEIVED",
      priceVariance: Math.abs(subtotal - Number(order.subtotal)) > 0.01,
      taxVariance: Math.abs(taxTotal - Number(order.taxTotal)) > 0.01,
      duplicateSupplierInvoice: false
    };
    const hasVariance = Object.values(variances).some(Boolean);
    const invoice = await this.prisma.supplierInvoice.create({
      data: {
        companyId,
        invoiceNo: await this.nextDocumentNo(companyId, "supplierInvoice", "PINV"),
        supplierInvoiceNo: dto.supplierInvoiceNo.trim(),
        supplierId: order.supplierId,
        purchaseOrderId: order.id,
        goodsReceiptId: dto.goodsReceiptId,
        status: hasVariance ? "VARIANCE_HELD" : "MATCHED",
        matchingStatus: hasVariance ? "VARIANCE" : "MATCHED",
        varianceJson: JSON.stringify(variances),
        subtotal: this.decimalText(subtotal),
        taxTotal: this.decimalText(taxTotal),
        total: this.decimalText(total),
        notes: dto.notes?.trim() || undefined
      },
      include: { supplier: { select: { code: true, name: true } }, purchaseOrder: { select: { poNo: true } }, goodsReceipt: { select: { receiptNo: true } } }
    });
    await this.audit.record({ companyId, userId, action: "match_supplier_invoice", module: "purchase", recordType: "SupplierInvoice", recordId: invoice.id, afterValue: invoice });
    return invoice;
  }

  async createPurchaseReturn(companyId: string, userId: string, dto: CreatePurchaseReturnDto) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, companyId },
      include: { supplier: true, lines: { include: { item: true } } }
    });
    if (!order) throw new BadRequestException("Purchase order was not found");
    const requested = new Map(dto.lines.map((line) => [line.purchaseOrderLineId, this.parsePositiveDecimal(line.quantity, "quantity")]));
    const lines = order.lines.map((line) => ({ line, quantity: requested.get(line.id) ?? 0 })).filter((entry) => entry.quantity > 0);
    if (!lines.length) throw new BadRequestException("No return lines were provided");
    const purchaseReturn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseReturn.create({
        data: {
          companyId,
          returnNo: await this.nextDocumentNo(companyId, "purchaseReturn", "PRT"),
          supplierId: order.supplierId,
          purchaseOrderId: order.id,
          reason: dto.reason?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          lines: {
            create: lines.map((entry) => ({
              purchaseOrderLineId: entry.line.id,
              itemId: entry.line.itemId,
              description: entry.line.description,
              quantity: this.decimalText(entry.quantity)
            }))
          }
        },
        include: { lines: true, purchaseOrder: { select: { poNo: true } }, supplier: { select: { code: true, name: true } } }
      });
      for (const entry of lines) {
        await this.postStockMovement(tx, {
          companyId,
          item: entry.line.item,
          quantity: entry.quantity,
          unitCost: Number(entry.line.unitPrice),
          movementType: "OUT",
          sourceType: "PURCHASE_RETURN",
          sourceDocumentId: created.returnNo,
          remarks: `Purchase return for ${order.poNo}`,
          userId
        });
      }
      return created;
    });
    await this.audit.record({ companyId, userId, action: "post_purchase_return", module: "purchase", recordType: "PurchaseReturn", recordId: purchaseReturn.id, afterValue: purchaseReturn });
    return purchaseReturn;
  }

  private async prepareTotals(companyId: string, lines: PurchaseLineDto[]) {
    const prepared = await this.prepareLines(companyId, lines, "unitPrice");
    const subtotal = prepared.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0);
    const taxTotal = prepared.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice) * (Number(line.taxRate) / 100), 0);
    return {
      lines: prepared.map((line) => ({ ...line, lineTotal: this.decimalText(Number(line.quantity) * Number(line.unitPrice) * (1 + Number(line.taxRate) / 100)) })),
      subtotal: this.decimalText(subtotal),
      taxTotal: this.decimalText(taxTotal),
      total: this.decimalText(subtotal + taxTotal)
    };
  }

  private async prepareLines(companyId: string, lines: PurchaseLineDto[], priceField: "unitPrice" | "estimatedUnitCost") {
    const prepared = [];
    for (const line of lines) {
      await this.assertItem(companyId, line.itemId);
      const quantity = this.parsePositiveDecimal(line.quantity, "quantity");
      const unitPrice = this.parseNonNegativeDecimal(line.unitPrice ?? "0", priceField);
      const taxRate = this.parseNonNegativeDecimal(line.taxRate ?? "0", "taxRate");
      if (taxRate > 100) throw new BadRequestException("Tax rate must be between 0 and 100");
      prepared.push({
        itemId: line.itemId,
        description: line.description.trim(),
        quantity: this.decimalText(quantity),
        unitPrice: this.decimalText(unitPrice),
        taxRate: this.decimalText(taxRate)
      });
    }
    return prepared;
  }

  private async postStockMovement(
    tx: Prisma.TransactionClient,
    params: {
      companyId: string;
      item: { id: string; code: string; itemType: string; warehouseId: string | null; purchasePrice: Prisma.Decimal };
      quantity: number;
      unitCost: number;
      movementType: "IN" | "OUT";
      sourceType: string;
      sourceDocumentId: string;
      remarks: string;
      userId: string;
    }
  ) {
    if (!STOCK_MANAGED_TYPES.has(params.item.itemType.trim().toLowerCase())) return;
    if (!params.item.warehouseId) throw new BadRequestException(`Item ${params.item.code} has no default warehouse`);
    const balance = await tx.stockBalance.findUnique({
      where: { companyId_itemId_warehouseId: { companyId: params.companyId, itemId: params.item.id, warehouseId: params.item.warehouseId } }
    });
    const currentQuantity = Number(balance?.quantityOnHand ?? 0);
    if (params.movementType === "OUT" && currentQuantity < params.quantity) throw new BadRequestException(`Insufficient stock for ${params.item.code}`);
    const currentCost = Number(balance?.averageCost ?? params.item.purchasePrice);
    const balanceAfter = params.movementType === "IN" ? currentQuantity + params.quantity : currentQuantity - params.quantity;
    const averageCost = params.movementType === "IN" && balanceAfter > 0
      ? ((currentQuantity * currentCost) + (params.quantity * params.unitCost)) / balanceAfter
      : currentCost;
    await tx.stockBalance.upsert({
      where: { companyId_itemId_warehouseId: { companyId: params.companyId, itemId: params.item.id, warehouseId: params.item.warehouseId } },
      update: { quantityOnHand: this.decimalText(balanceAfter), averageCost: this.decimalText(averageCost) },
      create: {
        companyId: params.companyId,
        itemId: params.item.id,
        warehouseId: params.item.warehouseId,
        quantityOnHand: this.decimalText(balanceAfter),
        averageCost: this.decimalText(averageCost)
      }
    });
    await tx.stockLedgerEntry.create({
      data: {
        companyId: params.companyId,
        itemId: params.item.id,
        warehouseId: params.item.warehouseId,
        movementType: params.movementType,
        sourceType: params.sourceType,
        sourceDocumentId: params.sourceDocumentId,
        quantityIn: params.movementType === "IN" ? this.decimalText(params.quantity) : "0",
        quantityOut: params.movementType === "OUT" ? this.decimalText(params.quantity) : "0",
        unitCost: this.decimalText(params.unitCost),
        valuationAmount: this.decimalText(params.quantity * params.unitCost),
        balanceAfter: this.decimalText(balanceAfter),
        remarks: params.remarks,
        postedById: params.userId
      }
    });
  }

  private async nextDocumentNo(companyId: string, model: "purchaseRequest" | "requestForQuotation" | "supplierQuotation" | "purchaseOrder" | "goodsReceipt" | "supplierInvoice" | "purchaseReturn", prefix: string) {
    const count =
      model === "purchaseRequest"
        ? await this.prisma.purchaseRequest.count({ where: { companyId } })
        : model === "requestForQuotation"
          ? await this.prisma.requestForQuotation.count({ where: { companyId } })
          : model === "supplierQuotation"
            ? await this.prisma.supplierQuotation.count({ where: { companyId } })
            : model === "purchaseOrder"
              ? await this.prisma.purchaseOrder.count({ where: { companyId } })
              : model === "goodsReceipt"
                ? await this.prisma.goodsReceipt.count({ where: { companyId } })
                : model === "supplierInvoice"
                  ? await this.prisma.supplierInvoice.count({ where: { companyId } })
                  : await this.prisma.purchaseReturn.count({ where: { companyId } });
    return `${prefix}-${String(count + 1).padStart(5, "0")}`;
  }

  private async assertSupplier(companyId: string, id: string) {
    const record = await this.prisma.supplier.findFirst({ where: { id, companyId, status: "ACTIVE" }, select: { id: true } });
    if (!record) throw new BadRequestException("Supplier was not found or inactive");
  }

  private async assertItem(companyId: string, id: string) {
    const record = await this.prisma.item.findFirst({ where: { id, companyId, isActive: true }, select: { id: true } });
    if (!record) throw new BadRequestException("Item was not found or inactive");
  }

  private async assertPurchaseRequest(companyId: string, id: string) {
    const record = await this.prisma.purchaseRequest.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("Purchase request was not found");
  }

  private async assertRfq(companyId: string, id: string) {
    const record = await this.prisma.requestForQuotation.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("RFQ was not found");
  }

  private parseOptionalDate(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException("Date value is invalid");
    return parsed;
  }

  private parsePositiveDecimal(value: string, field: string) {
    const parsed = this.parseNonNegativeDecimal(value, field);
    if (parsed <= 0) throw new BadRequestException(`${field} must be greater than zero`);
    return parsed;
  }

  private parseNonNegativeDecimal(value: string, field: string) {
    if (!/^\d+(\.\d{1,4})?$/.test(value.trim())) throw new BadRequestException(`${field} must be a non-negative number`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new BadRequestException(`${field} must be a non-negative number`);
    return parsed;
  }

  private decimalText(value: number) {
    return value.toFixed(4).replace(/\.?0+$/, "");
  }
}
