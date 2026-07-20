import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { CreateItemDto } from "./dto/create-item.dto";
import { CreateMasterRecordDto } from "./dto/create-master-record.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { ImportMasterDataDto } from "./dto/import-master-data.dto";

type MasterKind = "customer-categories" | "supplier-categories" | "item-categories" | "units" | "tax-codes" | "currencies" | "payment-terms";
type ImportTarget = "customers" | "suppliers" | "items" | "masters";
type ImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  normalized: Record<string, string | number | boolean | undefined>;
  errors: string[];
};

@Injectable()
export class MasterDataService {
  private importQueue?: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService
  ) {}

  customers(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
      take: 100
    });
  }

  suppliers(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
      take: 100
    });
  }

  items(companyId: string) {
    return this.prisma.item.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
      take: 100
    });
  }

  async createCustomer(companyId: string, userId: string, dto: CreateCustomerDto) {
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "customer", code);
    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        code,
        name: this.cleanText(dto.name),
        customerType: dto.customerType ?? "Business",
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        billingAddress: dto.billingAddress,
        shippingAddress: dto.shippingAddress,
        taxRegistrationNumber: dto.taxRegistrationNumber,
        creditLimit: this.validateDecimal(dto.creditLimit, "creditLimit", { defaultValue: "0" }),
        status: this.normalizeStatus(dto.status) ?? "ACTIVE",
        notes: dto.notes
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "customer", recordType: "Customer", recordId: customer.id, afterValue: customer });
    return customer;
  }

  async updateCustomer(companyId: string, userId: string, id: string, dto: CreateCustomerDto) {
    const before = await this.prisma.customer.findFirstOrThrow({ where: { id, companyId } });
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "customer", code, id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        code,
        name: this.cleanText(dto.name),
        customerType: dto.customerType,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        billingAddress: dto.billingAddress,
        shippingAddress: dto.shippingAddress,
        taxRegistrationNumber: dto.taxRegistrationNumber,
        creditLimit: this.validateDecimal(dto.creditLimit, "creditLimit"),
        status: this.normalizeStatus(dto.status),
        notes: dto.notes
      }
    });
    await this.audit.record({
      companyId,
      userId,
      action: "update",
      module: "customer",
      recordType: "Customer",
      recordId: customer.id,
      beforeValue: before,
      afterValue: customer
    });
    return customer;
  }

  async updateCustomerStatus(companyId: string, userId: string, id: string, status: "ACTIVE" | "INACTIVE") {
    const before = await this.prisma.customer.findFirstOrThrow({ where: { id, companyId } });
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { status }
    });
    await this.audit.record({
      companyId,
      userId,
      action: status === "ACTIVE" ? "activate" : "deactivate",
      module: "customer",
      recordType: "Customer",
      recordId: customer.id,
      beforeValue: before,
      afterValue: customer
    });
    return customer;
  }

  async createSupplier(companyId: string, userId: string, dto: CreateSupplierDto) {
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "supplier", code);
    const supplier = await this.prisma.supplier.create({
      data: {
        companyId,
        code,
        name: this.cleanText(dto.name),
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        address: dto.address,
        taxRegistrationNumber: dto.taxRegistrationNumber,
        status: this.normalizeStatus(dto.status) ?? "ACTIVE",
        notes: dto.notes
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "supplier", recordType: "Supplier", recordId: supplier.id, afterValue: supplier });
    return supplier;
  }

  async updateSupplier(companyId: string, userId: string, id: string, dto: CreateSupplierDto) {
    const before = await this.prisma.supplier.findFirstOrThrow({ where: { id, companyId } });
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "supplier", code, id);
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        code,
        name: this.cleanText(dto.name),
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        address: dto.address,
        taxRegistrationNumber: dto.taxRegistrationNumber,
        status: this.normalizeStatus(dto.status),
        notes: dto.notes
      }
    });
    await this.audit.record({
      companyId,
      userId,
      action: "update",
      module: "supplier",
      recordType: "Supplier",
      recordId: supplier.id,
      beforeValue: before,
      afterValue: supplier
    });
    return supplier;
  }

  async updateSupplierStatus(companyId: string, userId: string, id: string, status: "ACTIVE" | "INACTIVE") {
    const before = await this.prisma.supplier.findFirstOrThrow({ where: { id, companyId } });
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { status }
    });
    await this.audit.record({
      companyId,
      userId,
      action: status === "ACTIVE" ? "activate" : "deactivate",
      module: "supplier",
      recordType: "Supplier",
      recordId: supplier.id,
      beforeValue: before,
      afterValue: supplier
    });
    return supplier;
  }

  async createItem(companyId: string, userId: string, dto: CreateItemDto) {
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "item", code);
    const sellingPrice = this.validateDecimal(dto.sellingPrice, "sellingPrice", { defaultValue: "0" });
    const unitOfMeasureId = await this.validateUnitOfMeasure(companyId, dto.unitOfMeasureId);
    const warehouseId = await this.validateWarehouse(companyId, dto.warehouseId);
    const item = await this.prisma.item.create({
      data: {
        companyId,
        code,
        name: this.cleanText(dto.name),
        barcode: dto.barcode,
        description: dto.description,
        itemType: dto.itemType ?? "Stock",
        brand: dto.brand,
        unitOfMeasureId,
        purchaseUnit: dto.purchaseUnit,
        salesUnit: dto.salesUnit,
        unitConversion: this.validatePositiveDecimal(dto.unitConversion, "unitConversion", { defaultValue: "1" }),
        purchasePrice: this.validateDecimal(dto.purchasePrice, "purchasePrice", { defaultValue: "0" }),
        sellingPrice,
        minimumSellingPrice: sellingPrice,
        reorderLevel: this.validateDecimal(dto.reorderLevel, "reorderLevel", { defaultValue: "0" }),
        safetyStock: this.validateDecimal(dto.safetyStock, "safetyStock", { defaultValue: "0" }),
        warehouseId,
        batchTracking: dto.batchTracking ?? false,
        serialTracking: dto.serialTracking ?? false,
        expiryTracking: dto.expiryTracking ?? false
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "item", recordType: "Item", recordId: item.id, afterValue: item });
    return item;
  }

  async updateItem(companyId: string, userId: string, id: string, dto: CreateItemDto) {
    const before = await this.prisma.item.findFirstOrThrow({ where: { id, companyId } });
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "item", code, id);
    const sellingPrice = this.validateDecimal(dto.sellingPrice, "sellingPrice");
    const unitOfMeasureId = await this.validateUnitOfMeasure(companyId, dto.unitOfMeasureId);
    const warehouseId = await this.validateWarehouse(companyId, dto.warehouseId);
    const item = await this.prisma.item.update({
      where: { id },
      data: {
        code,
        name: this.cleanText(dto.name),
        barcode: dto.barcode,
        description: dto.description,
        itemType: dto.itemType,
        brand: dto.brand,
        unitOfMeasureId,
        purchaseUnit: dto.purchaseUnit,
        salesUnit: dto.salesUnit,
        unitConversion: this.validatePositiveDecimal(dto.unitConversion, "unitConversion"),
        purchasePrice: this.validateDecimal(dto.purchasePrice, "purchasePrice"),
        sellingPrice,
        minimumSellingPrice: sellingPrice,
        reorderLevel: this.validateDecimal(dto.reorderLevel, "reorderLevel"),
        safetyStock: this.validateDecimal(dto.safetyStock, "safetyStock"),
        warehouseId,
        batchTracking: dto.batchTracking,
        serialTracking: dto.serialTracking,
        expiryTracking: dto.expiryTracking
      }
    });
    await this.audit.record({
      companyId,
      userId,
      action: "update",
      module: "item",
      recordType: "Item",
      recordId: item.id,
      beforeValue: before,
      afterValue: item
    });
    return item;
  }

  async updateItemActive(companyId: string, userId: string, id: string, isActive: boolean) {
    const before = await this.prisma.item.findFirstOrThrow({ where: { id, companyId } });
    const item = await this.prisma.item.update({
      where: { id },
      data: { isActive }
    });
    await this.audit.record({
      companyId,
      userId,
      action: isActive ? "activate" : "deactivate",
      module: "item",
      recordType: "Item",
      recordId: item.id,
      beforeValue: before,
      afterValue: item
    });
    return item;
  }

  async previewImport(companyId: string, dto: ImportMasterDataDto) {
    const target = this.resolveImportTarget(dto);
    const rows = dto.rows.slice(0, 500);
    const mappedRows = rows.map((row, index) => this.mapImportRow(target, dto.masterKind, dto.mapping, row, index + 2));
    const existingCodes = await this.existingImportCodes(companyId, target, dto.masterKind);
    const fileCodes = new Map<string, number>();

    for (const row of mappedRows) {
      const code = String(row.normalized.code ?? "").trim().toUpperCase();
      if (!code) continue;

      const firstRow = fileCodes.get(code);
      if (firstRow) {
        row.errors.push(`Duplicate code in file. First seen on row ${firstRow}.`);
      } else {
        fileCodes.set(code, row.rowNumber);
      }

      if (existingCodes.has(code)) {
        row.errors.push("Code already exists.");
      }
    }

    const validRows = mappedRows.filter((row) => row.errors.length === 0);
    const invalidRows = mappedRows.filter((row) => row.errors.length > 0);
    return {
      target: dto.target,
      masterKind: dto.masterKind,
      totalRows: mappedRows.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      rows: mappedRows
    };
  }

  async commitImport(companyId: string, userId: string, dto: ImportMasterDataDto) {
    const preview = await this.previewImport(companyId, dto);
    const validRows = preview.rows.filter((row) => row.errors.length === 0);
    const created: unknown[] = [];

    if (validRows.length > this.backgroundImportThreshold()) {
      const importJob = await this.createImportJob(companyId, userId, dto, validRows);

      await this.audit.record({
        companyId,
        userId,
        action: "import_queued",
        module: "master_data",
        recordType: dto.target === "masters" ? dto.masterKind : dto.target,
        recordId: importJob.id,
        afterValue: {
          target: dto.target,
          masterKind: dto.masterKind,
          queuedRows: validRows.length,
          rejected: preview.invalidRows
        }
      });

      return {
        ...preview,
        background: true,
        queuedRows: validRows.length,
        importedRows: 0,
        importJob: this.summarizeImportJob(importJob)
      };
    }

    for (const row of validRows) {
      created.push(await this.createImportedRow(companyId, dto.target, dto.masterKind, row.normalized));
    }

    await this.audit.record({
      companyId,
      userId,
      action: "import",
      module: "master_data",
      recordType: dto.target === "masters" ? dto.masterKind : dto.target,
      afterValue: {
        target: dto.target,
        masterKind: dto.masterKind,
        imported: created.length,
        rejected: preview.invalidRows
      }
    });

    return {
      ...preview,
      importedRows: created.length
    };
  }

  listImportJobs(companyId: string) {
    return this.prisma.importJob.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        target: true,
        masterKind: true,
        status: true,
        totalRows: true,
        processedRows: true,
        importedRows: true,
        failedRows: true,
        errorJson: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        requestedBy: {
          select: {
            displayName: true,
            email: true
          }
        }
      }
    });
  }

  async getImportJob(companyId: string, id: string) {
    const importJob = await this.prisma.importJob.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        target: true,
        masterKind: true,
        status: true,
        totalRows: true,
        processedRows: true,
        importedRows: true,
        failedRows: true,
        errorJson: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        requestedBy: {
          select: {
            displayName: true,
            email: true
          }
        }
      }
    });

    if (!importJob) throw new BadRequestException("Import job not found");
    return importJob;
  }

  listMaster(companyId: string, kind: MasterKind) {
    if (kind === "customer-categories") return this.prisma.customerCategory.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    if (kind === "supplier-categories") return this.prisma.supplierCategory.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    if (kind === "item-categories") return this.prisma.itemCategory.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    if (kind === "units") return this.prisma.unitOfMeasure.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    if (kind === "tax-codes") return this.prisma.taxCode.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    if (kind === "currencies") return this.prisma.currency.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    return this.prisma.paymentTerm.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }

  async createMaster(companyId: string, userId: string, kind: MasterKind, dto: CreateMasterRecordDto) {
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "master", code, undefined, kind);
    const common = { companyId, code, name: this.cleanText(dto.name), isActive: dto.isActive ?? true };
    const created =
      kind === "customer-categories"
        ? await this.prisma.customerCategory.create({ data: common })
        : kind === "supplier-categories"
          ? await this.prisma.supplierCategory.create({ data: common })
          : kind === "item-categories"
            ? await this.prisma.itemCategory.create({ data: common })
            : kind === "units"
              ? await this.prisma.unitOfMeasure.create({ data: common })
              : kind === "tax-codes"
                ? await this.prisma.taxCode.create({ data: { ...common, ratePercent: this.validateDecimal(dto.ratePercent, "ratePercent", { defaultValue: "0", max: 100 }) ?? "0" } })
                : kind === "currencies"
                  ? await this.prisma.currency.create({ data: { ...common, symbol: dto.symbol } })
                  : await this.prisma.paymentTerm.create({ data: { ...common, days: this.validateDays(dto.days) } });

    await this.audit.record({ companyId, userId, action: "create", module: "master_data", recordType: kind, recordId: created.id, afterValue: created });
    return created;
  }

  async updateMaster(companyId: string, userId: string, kind: MasterKind, id: string, dto: CreateMasterRecordDto) {
    const code = this.normalizeCode(dto.code);
    await this.assertUniqueCode(companyId, "master", code, id, kind);
    const common = { code, name: this.cleanText(dto.name), isActive: dto.isActive };
    const before = await this.findMasterOrThrow(companyId, kind, id);
    const updated =
      kind === "customer-categories"
        ? await this.prisma.customerCategory.update({ where: { id }, data: common })
        : kind === "supplier-categories"
          ? await this.prisma.supplierCategory.update({ where: { id }, data: common })
          : kind === "item-categories"
            ? await this.prisma.itemCategory.update({ where: { id }, data: common })
            : kind === "units"
              ? await this.prisma.unitOfMeasure.update({ where: { id }, data: common })
              : kind === "tax-codes"
                ? await this.prisma.taxCode.update({ where: { id }, data: { ...common, ratePercent: this.validateDecimal(dto.ratePercent, "ratePercent", { max: 100 }) } })
                : kind === "currencies"
                  ? await this.prisma.currency.update({ where: { id }, data: { ...common, symbol: dto.symbol } })
                  : await this.prisma.paymentTerm.update({ where: { id }, data: { ...common, days: dto.days === undefined ? undefined : this.validateDays(dto.days) } });

    await this.audit.record({
      companyId,
      userId,
      action: "update",
      module: "master_data",
      recordType: kind,
      recordId: updated.id,
      beforeValue: before,
      afterValue: updated
    });
    return updated;
  }

  async updateMasterActive(companyId: string, userId: string, kind: MasterKind, id: string, isActive: boolean) {
    const before = await this.findMasterOrThrow(companyId, kind, id);
    const updated =
      kind === "customer-categories"
        ? await this.prisma.customerCategory.update({ where: { id }, data: { isActive } })
        : kind === "supplier-categories"
          ? await this.prisma.supplierCategory.update({ where: { id }, data: { isActive } })
          : kind === "item-categories"
            ? await this.prisma.itemCategory.update({ where: { id }, data: { isActive } })
            : kind === "units"
              ? await this.prisma.unitOfMeasure.update({ where: { id }, data: { isActive } })
              : kind === "tax-codes"
                ? await this.prisma.taxCode.update({ where: { id }, data: { isActive } })
                : kind === "currencies"
                  ? await this.prisma.currency.update({ where: { id }, data: { isActive } })
                  : await this.prisma.paymentTerm.update({ where: { id }, data: { isActive } });

    await this.audit.record({
      companyId,
      userId,
      action: isActive ? "activate" : "deactivate",
      module: "master_data",
      recordType: kind,
      recordId: updated.id,
      beforeValue: before,
      afterValue: updated
    });
    return updated;
  }

  private resolveImportTarget(dto: ImportMasterDataDto): ImportTarget {
    if (dto.target === "masters" && !dto.masterKind) {
      throw new BadRequestException("masterKind is required for supporting master imports");
    }

    return dto.target;
  }

  private async existingImportCodes(companyId: string, target: ImportTarget, masterKind?: MasterKind) {
    const rows =
      target === "customers"
        ? await this.prisma.customer.findMany({ where: { companyId }, select: { code: true } })
        : target === "suppliers"
          ? await this.prisma.supplier.findMany({ where: { companyId }, select: { code: true } })
          : target === "items"
            ? await this.prisma.item.findMany({ where: { companyId }, select: { code: true } })
            : masterKind === "customer-categories"
              ? await this.prisma.customerCategory.findMany({ where: { companyId }, select: { code: true } })
              : masterKind === "supplier-categories"
                ? await this.prisma.supplierCategory.findMany({ where: { companyId }, select: { code: true } })
                : masterKind === "item-categories"
                  ? await this.prisma.itemCategory.findMany({ where: { companyId }, select: { code: true } })
                  : masterKind === "units"
                    ? await this.prisma.unitOfMeasure.findMany({ where: { companyId }, select: { code: true } })
                    : masterKind === "tax-codes"
                      ? await this.prisma.taxCode.findMany({ where: { companyId }, select: { code: true } })
                      : masterKind === "currencies"
                        ? await this.prisma.currency.findMany({ where: { companyId }, select: { code: true } })
                        : await this.prisma.paymentTerm.findMany({ where: { companyId }, select: { code: true } });

    return new Set(rows.map((row) => row.code.toUpperCase()));
  }

  private mapImportRow(target: ImportTarget, masterKind: MasterKind | undefined, mapping: Record<string, string>, source: Record<string, unknown>, rowNumber: number): ImportPreviewRow {
    const normalized: Record<string, string | number | boolean | undefined> = {};
    const values: Record<string, string> = {};
    const errors: string[] = [];
    const fields = this.importFields(target);

    for (const field of fields) {
      const column = mapping[field];
      const rawValue = column ? source[column] : undefined;
      const value = this.cleanImportValue(rawValue);
      values[field] = value;
      normalized[field] = value || undefined;
    }

    normalized.code = String(normalized.code ?? "").trim().toUpperCase();
    normalized.email = normalized.email ? String(normalized.email).trim().toLowerCase() : undefined;
    normalized.status = normalized.status ? String(normalized.status).trim().toUpperCase() : "ACTIVE";
    normalized.itemType = normalized.itemType || "Stock";

    if (!normalized.code) errors.push("Code is required.");
    if (!normalized.name) errors.push("Name is required.");
    if (String(normalized.code ?? "").length > 30) errors.push("Code must be 30 characters or fewer.");
    if (String(normalized.name ?? "").length > 180) errors.push("Name must be 180 characters or fewer.");

    if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(normalized.email))) {
      errors.push("Email is invalid.");
    }

    if (normalized.status && !["ACTIVE", "INACTIVE"].includes(String(normalized.status))) {
      errors.push("Status must be ACTIVE or INACTIVE.");
    }

    for (const field of ["sellingPrice", "purchasePrice", "reorderLevel", "ratePercent"]) {
      if (normalized[field] !== undefined) {
        const decimal = this.parseDecimal(normalized[field]);
        if (decimal === null) {
          errors.push(`${field} must be a non-negative number.`);
        } else if (field === "ratePercent" && decimal > 100) {
          errors.push("ratePercent must be between 0 and 100.");
        }
      }
    }

    if (target === "masters" && masterKind === "tax-codes" && normalized.ratePercent === undefined) {
      normalized.ratePercent = "0";
    }

    if (normalized.days !== undefined) {
      const days = Number(normalized.days);
      if (!Number.isInteger(days) || days < 0 || days > 365) {
        errors.push("days must be a whole number from 0 to 365.");
      } else {
        normalized.days = days;
      }
    } else if (target === "masters" && masterKind === "payment-terms") {
      normalized.days = 0;
    }

    return { rowNumber, values, normalized, errors };
  }

  private importFields(target: ImportTarget) {
    if (target === "customers" || target === "suppliers") {
      return ["code", "name", "contactPerson", "email", "phone", "status"];
    }

    if (target === "items") {
      return ["code", "name", "itemType", "sellingPrice", "purchasePrice", "reorderLevel"];
    }

    return ["code", "name", "symbol", "ratePercent", "days"];
  }

  private async createImportedRow(companyId: string, target: ImportTarget, masterKind: MasterKind | undefined, values: Record<string, string | number | boolean | undefined>) {
    const code = String(values.code);
    const name = String(values.name);

    if (target === "customers") {
      return this.prisma.customer.create({
        data: {
          companyId,
          code,
          name,
          contactPerson: values.contactPerson ? String(values.contactPerson) : undefined,
          email: values.email ? String(values.email).toLowerCase() : undefined,
          phone: values.phone ? String(values.phone) : undefined,
          status: values.status ? String(values.status) : "ACTIVE"
        }
      });
    }

    if (target === "suppliers") {
      return this.prisma.supplier.create({
        data: {
          companyId,
          code,
          name,
          contactPerson: values.contactPerson ? String(values.contactPerson) : undefined,
          email: values.email ? String(values.email).toLowerCase() : undefined,
          phone: values.phone ? String(values.phone) : undefined,
          status: values.status ? String(values.status) : "ACTIVE"
        }
      });
    }

    if (target === "items") {
      return this.prisma.item.create({
        data: {
          companyId,
          code,
          name,
          itemType: values.itemType ? String(values.itemType) : "Stock",
          sellingPrice: values.sellingPrice ? String(values.sellingPrice) : "0",
          purchasePrice: values.purchasePrice ? String(values.purchasePrice) : "0",
          minimumSellingPrice: values.sellingPrice ? String(values.sellingPrice) : "0",
          reorderLevel: values.reorderLevel ? String(values.reorderLevel) : "0"
        }
      });
    }

    const common = { companyId, code, name, isActive: true };
    return masterKind === "customer-categories"
      ? this.prisma.customerCategory.create({ data: common })
      : masterKind === "supplier-categories"
        ? this.prisma.supplierCategory.create({ data: common })
        : masterKind === "item-categories"
          ? this.prisma.itemCategory.create({ data: common })
          : masterKind === "units"
            ? this.prisma.unitOfMeasure.create({ data: common })
            : masterKind === "tax-codes"
              ? this.prisma.taxCode.create({ data: { ...common, ratePercent: values.ratePercent ? String(values.ratePercent) : "0" } })
              : masterKind === "currencies"
                ? this.prisma.currency.create({ data: { ...common, symbol: values.symbol ? String(values.symbol) : undefined } })
                : this.prisma.paymentTerm.create({ data: { ...common, days: Number(values.days ?? 0) } });
  }

  private cleanImportValue(value: unknown) {
    return String(value ?? "").trim();
  }

  private backgroundImportThreshold() {
    const configured = Number(this.config.get<string>("IMPORT_BACKGROUND_THRESHOLD", "100"));
    return Number.isFinite(configured) && configured >= 0 ? configured : 100;
  }

  private async createImportJob(companyId: string, userId: string, dto: ImportMasterDataDto, rows: ImportPreviewRow[]) {
    const importJob = await this.prisma.importJob.create({
      data: {
        companyId,
        requestedById: userId,
        target: dto.target,
        masterKind: dto.masterKind,
        totalRows: rows.length,
        payloadJson: JSON.stringify({
          target: dto.target,
          masterKind: dto.masterKind,
          rows: rows.map((row) => ({
            rowNumber: row.rowNumber,
            values: row.normalized
          }))
        })
      }
    });

    try {
      const queued = await this.getImportQueue().add(
        "master-data-import",
        { importJobId: importJob.id },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 50,
          removeOnFail: 100
        }
      );

      return this.prisma.importJob.update({
        where: { id: importJob.id },
        data: { queueJobId: String(queued.id ?? "") }
      });
    } catch (error) {
      return this.prisma.importJob.update({
        where: { id: importJob.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorJson: JSON.stringify([{ message: `Unable to queue import job: ${this.errorMessage(error)}` }])
        }
      });
    }
  }

  private getImportQueue() {
    if (!this.importQueue) {
      const redisUrl = this.config.get<string>("REDIS_URL", "redis://localhost:6379");
      const parsedRedisUrl = new URL(redisUrl);
      this.importQueue = new Queue("erp-background-jobs", {
        connection: {
          host: parsedRedisUrl.hostname,
          port: Number(parsedRedisUrl.port || 6379),
          password: parsedRedisUrl.password || undefined
        }
      });
    }

    return this.importQueue;
  }

  private summarizeImportJob(importJob: {
    id: string;
    target: string;
    masterKind: string | null;
    status: string;
    totalRows: number;
    processedRows: number;
    importedRows: number;
    failedRows: number;
    errorJson: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: importJob.id,
      target: importJob.target,
      masterKind: importJob.masterKind,
      status: importJob.status,
      totalRows: importJob.totalRows,
      processedRows: importJob.processedRows,
      importedRows: importJob.importedRows,
      failedRows: importJob.failedRows,
      errors: importJob.errorJson ? JSON.parse(importJob.errorJson) : [],
      createdAt: importJob.createdAt,
      startedAt: importJob.startedAt,
      completedAt: importJob.completedAt
    };
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private cleanText(value: string) {
    return value.trim();
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private normalizeStatus(status?: string) {
    if (status === undefined) return undefined;
    const normalized = status.trim().toUpperCase();
    if (!["ACTIVE", "INACTIVE"].includes(normalized)) {
      throw new BadRequestException("Status must be ACTIVE or INACTIVE");
    }

    return normalized;
  }

  private validateDecimal(value: unknown, field: string, options?: { defaultValue?: string; max?: number }) {
    if (value === undefined || value === null || value === "") {
      return options?.defaultValue;
    }

    const decimal = this.parseDecimal(value);
    if (decimal === null) {
      throw new BadRequestException(`${field} must be a non-negative number`);
    }

    if (options?.max !== undefined && decimal > options.max) {
      throw new BadRequestException(`${field} must be between 0 and ${options.max}`);
    }

    return String(value).trim();
  }

  private validatePositiveDecimal(value: unknown, field: string, options?: { defaultValue?: string }) {
    const decimalText = this.validateDecimal(value, field, options);
    if (decimalText === undefined) return undefined;

    const decimal = this.parseDecimal(decimalText);
    if (decimal === null || decimal <= 0) {
      throw new BadRequestException(`${field} must be greater than zero`);
    }

    return decimalText;
  }

  private async validateUnitOfMeasure(companyId: string, unitOfMeasureId?: string) {
    if (!unitOfMeasureId) return undefined;
    const unit = await this.prisma.unitOfMeasure.findFirst({ where: { id: unitOfMeasureId, companyId }, select: { id: true, isActive: true } });
    if (!unit) throw new BadRequestException("Unit of measure was not found");
    if (!unit.isActive) throw new BadRequestException("Unit of measure must be active");
    return unit.id;
  }

  private async validateWarehouse(companyId: string, warehouseId?: string) {
    if (!warehouseId) return undefined;
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: warehouseId, companyId }, select: { id: true, isActive: true } });
    if (!warehouse) throw new BadRequestException("Warehouse was not found");
    if (!warehouse.isActive) throw new BadRequestException("Warehouse must be active");
    return warehouse.id;
  }

  private validateDays(days?: number) {
    if (days === undefined) return 0;
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      throw new BadRequestException("days must be a whole number from 0 to 365");
    }

    return days;
  }

  private parseDecimal(value: unknown) {
    const text = String(value).trim();
    if (!/^\d+(\.\d+)?$/.test(text)) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async assertUniqueCode(companyId: string, target: "customer" | "supplier" | "item" | "master", code: string, excludeId?: string, masterKind?: MasterKind) {
    const where = { companyId, code, id: excludeId ? { not: excludeId } : undefined };
    const duplicate =
      target === "customer"
        ? await this.prisma.customer.findFirst({ where, select: { id: true } })
        : target === "supplier"
          ? await this.prisma.supplier.findFirst({ where, select: { id: true } })
          : target === "item"
            ? await this.prisma.item.findFirst({ where, select: { id: true } })
            : await this.findMasterByCode(companyId, masterKind, code, excludeId);

    if (duplicate) {
      throw new BadRequestException(`Code ${code} already exists`);
    }
  }

  private findMasterByCode(companyId: string, kind: MasterKind | undefined, code: string, excludeId?: string) {
    if (!kind) throw new BadRequestException("masterKind is required");
    const where = { companyId, code, id: excludeId ? { not: excludeId } : undefined };
    if (kind === "customer-categories") return this.prisma.customerCategory.findFirst({ where, select: { id: true } });
    if (kind === "supplier-categories") return this.prisma.supplierCategory.findFirst({ where, select: { id: true } });
    if (kind === "item-categories") return this.prisma.itemCategory.findFirst({ where, select: { id: true } });
    if (kind === "units") return this.prisma.unitOfMeasure.findFirst({ where, select: { id: true } });
    if (kind === "tax-codes") return this.prisma.taxCode.findFirst({ where, select: { id: true } });
    if (kind === "currencies") return this.prisma.currency.findFirst({ where, select: { id: true } });
    return this.prisma.paymentTerm.findFirst({ where, select: { id: true } });
  }

  private findMasterOrThrow(companyId: string, kind: MasterKind, id: string) {
    if (kind === "customer-categories") return this.prisma.customerCategory.findFirstOrThrow({ where: { id, companyId } });
    if (kind === "supplier-categories") return this.prisma.supplierCategory.findFirstOrThrow({ where: { id, companyId } });
    if (kind === "item-categories") return this.prisma.itemCategory.findFirstOrThrow({ where: { id, companyId } });
    if (kind === "units") return this.prisma.unitOfMeasure.findFirstOrThrow({ where: { id, companyId } });
    if (kind === "tax-codes") return this.prisma.taxCode.findFirstOrThrow({ where: { id, companyId } });
    if (kind === "currencies") return this.prisma.currency.findFirstOrThrow({ where: { id, companyId } });
    return this.prisma.paymentTerm.findFirstOrThrow({ where: { id, companyId } });
  }
}
