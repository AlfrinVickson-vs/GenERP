import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  ConvertQuotationDto,
  CreateActivityDto,
  CreateCreditNoteDto,
  CreateDeliveryDto,
  CreateEnquiryDto,
  CreateLeadDto,
  CreateOpportunityDto,
  CreateQuotationDto,
  CreateReceiptDto,
  CreateSalesInvoiceDto,
  CreateSalesOrderDto,
  CreateSalesReturnDto,
  ReviseQuotationDto,
  SalesLineDto
} from "./dto/sales.dto";

const STOCK_MANAGED_TYPES = new Set(["stock", "consumable"]);

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  leads(companyId: string) {
    return this.prisma.lead.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 100 });
  }

  opportunities(companyId: string) {
    return this.prisma.opportunity.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, lead: { select: { code: true, name: true } } }
    });
  }

  quotations(companyId: string) {
    return this.prisma.quotation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, lines: true, _count: { select: { salesOrders: true } } }
    });
  }

  salesOrders(companyId: string) {
    return this.prisma.salesOrder.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        customer: { select: { code: true, name: true } },
        lines: {
          include: {
            item: { select: { code: true, name: true } },
            deliveryLines: { select: { quantity: true } }
          }
        }
      }
    });
  }

  deliveries(companyId: string) {
    return this.prisma.delivery.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { salesOrder: { select: { orderNo: true } }, lines: true }
    });
  }

  activities(companyId: string) {
    return this.prisma.activity.findMany({
      where: { companyId },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 100,
      include: {
        customer: { select: { code: true, name: true } },
        lead: { select: { code: true, name: true } },
        opportunity: { select: { code: true, title: true } },
        quotation: { select: { quoteNo: true } },
        salesOrder: { select: { orderNo: true } }
      }
    });
  }

  overdueActivities(companyId: string) {
    return this.prisma.activity.findMany({
      where: { companyId, status: { not: "COMPLETED" }, dueAt: { lt: new Date() } },
      orderBy: { dueAt: "asc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, opportunity: { select: { code: true, title: true } } }
    });
  }

  enquiries(companyId: string) {
    return this.prisma.customerEnquiry.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, quotations: { select: { id: true, quoteNo: true, status: true } } }
    });
  }

  invoices(companyId: string) {
    return this.prisma.salesInvoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, salesOrder: { select: { orderNo: true } }, lines: true, receipts: true, creditNotes: true }
    });
  }

  receipts(companyId: string) {
    return this.prisma.receipt.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, salesInvoice: { select: { invoiceNo: true } } }
    });
  }

  creditNotes(companyId: string) {
    return this.prisma.creditNote.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, salesInvoice: { select: { invoiceNo: true } }, lines: true }
    });
  }

  returns(companyId: string) {
    return this.prisma.salesReturn.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { customer: { select: { code: true, name: true } }, salesOrder: { select: { orderNo: true } }, lines: true }
    });
  }

  async createLead(companyId: string, userId: string, dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        companyId,
        code: await this.nextDocumentNo(companyId, "lead", "LEAD"),
        name: dto.name.trim(),
        companyName: dto.companyName?.trim() || undefined,
        contactName: dto.contactName?.trim() || undefined,
        email: dto.email?.trim().toLowerCase() || undefined,
        phone: dto.phone?.trim() || undefined,
        source: dto.source?.trim() || undefined,
        status: dto.stage?.trim().toUpperCase() || "NEW",
        expectedValue: this.decimalText(dto.expectedValue ?? "0"),
        expectedCloseDate: this.parseOptionalDate(dto.expectedCloseDate),
        notes: dto.notes?.trim() || undefined
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "crm", recordType: "Lead", recordId: lead.id, afterValue: lead });
    return lead;
  }

  async createOpportunity(companyId: string, userId: string, dto: CreateOpportunityDto) {
    if (dto.customerId) await this.assertCustomer(companyId, dto.customerId);
    if (dto.leadId) await this.assertLead(companyId, dto.leadId);
    const opportunity = await this.prisma.opportunity.create({
      data: {
        companyId,
        code: await this.nextDocumentNo(companyId, "opportunity", "OPP"),
        title: dto.title.trim(),
        leadId: dto.leadId,
        customerId: dto.customerId,
        stage: dto.stage?.trim().toUpperCase() || "QUALIFIED",
        expectedValue: this.decimalText(dto.expectedValue ?? "0"),
        expectedCloseDate: this.parseOptionalDate(dto.expectedCloseDate),
        notes: dto.notes?.trim() || undefined
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "crm", recordType: "Opportunity", recordId: opportunity.id, afterValue: opportunity });
    return opportunity;
  }

  async createQuotation(companyId: string, userId: string, dto: CreateQuotationDto) {
    await this.assertCustomer(companyId, dto.customerId);
    if (dto.opportunityId) await this.assertOpportunity(companyId, dto.opportunityId);
    if (dto.enquiryId) await this.assertEnquiry(companyId, dto.enquiryId);
    const totals = await this.prepareLines(companyId, dto.lines);
    const quoteNo = await this.nextDocumentNo(companyId, "quotation", "QUO");
    const quotation = await this.prisma.quotation.create({
      data: {
        companyId,
        quoteNo,
        customerId: dto.customerId,
        opportunityId: dto.opportunityId,
        enquiryId: dto.enquiryId,
        validUntil: this.parseOptionalDate(dto.validUntil),
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        notes: dto.notes?.trim() || undefined,
        lines: { create: totals.lines }
      },
      include: { lines: true, customer: { select: { code: true, name: true } } }
    });
    if (dto.enquiryId) await this.prisma.customerEnquiry.update({ where: { id: dto.enquiryId }, data: { status: "QUOTED" } });
    await this.audit.record({ companyId, userId, action: "create", module: "sales", recordType: "Quotation", recordId: quotation.id, afterValue: quotation });
    return quotation;
  }

  async createSalesOrder(companyId: string, userId: string, dto: CreateSalesOrderDto) {
    await this.assertCustomer(companyId, dto.customerId);
    if (dto.quotationId) await this.assertQuotation(companyId, dto.quotationId);
    const totals = await this.prepareLines(companyId, dto.lines);
    const reservedLines = await this.reserveLines(companyId, totals.lines);
    const salesOrder = await this.prisma.salesOrder.create({
      data: {
        companyId,
        orderNo: await this.nextDocumentNo(companyId, "salesOrder", "SO"),
        customerId: dto.customerId,
        quotationId: dto.quotationId,
        status: "CONFIRMED",
        expectedDeliveryDate: this.parseOptionalDate(dto.expectedDeliveryDate),
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        notes: dto.notes?.trim() || undefined,
        lines: { create: reservedLines }
      },
      include: { lines: true, customer: { select: { code: true, name: true } } }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "sales", recordType: "SalesOrder", recordId: salesOrder.id, afterValue: salesOrder });
    return salesOrder;
  }

  async convertQuotationToSalesOrder(companyId: string, userId: string, id: string, dto: ConvertQuotationDto) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: { lines: true, salesOrders: { select: { id: true } } }
    });
    if (!quotation) throw new BadRequestException("Quotation was not found");
    if (quotation.salesOrders.length > 0) throw new BadRequestException("Quotation has already been converted to a sales order");
    if (["CANCELLED", "REJECTED"].includes(quotation.status.trim().toUpperCase())) {
      throw new BadRequestException("Cancelled or rejected quotations cannot be converted");
    }

    const salesOrder = await this.createSalesOrder(companyId, userId, {
      customerId: quotation.customerId,
      quotationId: quotation.id,
      expectedDeliveryDate: dto.expectedDeliveryDate,
      notes: dto.notes?.trim() || `Converted from ${quotation.quoteNo}`,
      lines: quotation.lines.map((line) => ({
        itemId: line.itemId ?? undefined,
        description: line.description,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        discountPercent: String(line.discountPercent),
        taxRate: String(line.taxRate)
      }))
    });

    const acceptedQuotation = await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: "ACCEPTED" },
      include: { lines: true, customer: { select: { code: true, name: true } }, _count: { select: { salesOrders: true } } }
    });
    await this.audit.record({
      companyId,
      userId,
      action: "convert_to_order",
      module: "sales",
      recordType: "Quotation",
      recordId: quotation.id,
      beforeValue: quotation,
      afterValue: { quotation: acceptedQuotation, salesOrder }
    });
    return { quotation: acceptedQuotation, salesOrder };
  }

  async createActivity(companyId: string, userId: string, dto: CreateActivityDto) {
    if (dto.leadId) await this.assertLead(companyId, dto.leadId);
    if (dto.opportunityId) await this.assertOpportunity(companyId, dto.opportunityId);
    if (dto.customerId) await this.assertCustomer(companyId, dto.customerId);
    if (dto.quotationId) await this.assertQuotation(companyId, dto.quotationId);
    if (dto.salesOrderId) await this.assertSalesOrder(companyId, dto.salesOrderId);
    const activity = await this.prisma.activity.create({
      data: {
        companyId,
        code: await this.nextDocumentNo(companyId, "activity", "ACT"),
        type: dto.type?.trim().toUpperCase() || "TASK",
        subject: dto.subject.trim(),
        priority: dto.priority?.trim().toUpperCase() || "NORMAL",
        dueAt: this.parseOptionalDate(dto.dueAt),
        notes: dto.notes?.trim() || undefined,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        customerId: dto.customerId,
        quotationId: dto.quotationId,
        salesOrderId: dto.salesOrderId,
        assignedToId: userId
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "crm", recordType: "Activity", recordId: activity.id, afterValue: activity });
    return activity;
  }

  async completeActivity(companyId: string, userId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, companyId } });
    if (!activity) throw new BadRequestException("Activity was not found");
    const completed = await this.prisma.activity.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date(), completedById: userId }
    });
    await this.audit.record({ companyId, userId, action: "complete", module: "crm", recordType: "Activity", recordId: id, beforeValue: activity, afterValue: completed });
    return completed;
  }

  async createEnquiry(companyId: string, userId: string, dto: CreateEnquiryDto) {
    await this.assertCustomer(companyId, dto.customerId);
    const enquiry = await this.prisma.customerEnquiry.create({
      data: {
        companyId,
        enquiryNo: await this.nextDocumentNo(companyId, "customerEnquiry", "ENQ"),
        customerId: dto.customerId,
        subject: dto.subject.trim(),
        source: dto.source?.trim() || undefined,
        expectedValue: this.decimalText(dto.expectedValue ?? "0"),
        dueAt: this.parseOptionalDate(dto.dueAt),
        notes: dto.notes?.trim() || undefined
      }
    });
    await this.audit.record({ companyId, userId, action: "create", module: "crm", recordType: "CustomerEnquiry", recordId: enquiry.id, afterValue: enquiry });
    return enquiry;
  }

  async reviseQuotation(companyId: string, userId: string, id: string, dto: ReviseQuotationDto) {
    const original = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: { lines: true, parentQuotation: true, revisions: true }
    });
    if (!original) throw new BadRequestException("Quotation was not found");
    const root = original.parentQuotation ?? original;
    const existingRevisions = await this.prisma.quotation.count({ where: { companyId, parentQuotationId: root.id } });
    const revisionNo = existingRevisions + 1;
    const lineDtos = dto.lines ?? original.lines.map((line) => ({
      itemId: line.itemId ?? undefined,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      discountPercent: String(line.discountPercent),
      taxRate: String(line.taxRate)
    }));
    const totals = await this.prepareLines(companyId, lineDtos);
    const revised = await this.prisma.$transaction(async (tx) => {
      await tx.quotation.update({ where: { id: original.id }, data: { status: "SUPERSEDED" } });
      return tx.quotation.create({
        data: {
          companyId,
          quoteNo: `${root.quoteNo}-R${revisionNo}`,
          customerId: original.customerId,
          opportunityId: original.opportunityId,
          enquiryId: original.enquiryId,
          parentQuotationId: root.id,
          revisionNo,
          status: "DRAFT",
          validUntil: original.validUntil,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          notes: dto.notes?.trim() || `Revision ${revisionNo} of ${root.quoteNo}`,
          lines: { create: totals.lines }
        },
        include: { lines: true, customer: { select: { code: true, name: true } } }
      });
    });
    await this.audit.record({ companyId, userId, action: "revise", module: "sales", recordType: "Quotation", recordId: revised.id, beforeValue: original, afterValue: revised });
    return revised;
  }

  async fulfilmentReport(companyId: string) {
    const orders = await this.prisma.salesOrder.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { code: true, name: true } },
        lines: {
          include: {
            item: { select: { code: true, name: true } },
            deliveryLines: { select: { quantity: true } }
          }
        }
      }
    });

    const orderSummaries = orders.map((order) => {
      const lines = order.lines.map((line) => {
        const orderedQuantity = Number(line.quantity);
        const deliveredQuantity = line.deliveryLines.reduce((sum, deliveryLine) => sum + Number(deliveryLine.quantity), 0);
        const backorderQuantity = Math.max(orderedQuantity - deliveredQuantity, 0);
        return {
          id: line.id,
          salesOrderId: order.id,
          orderNo: order.orderNo,
          customer: order.customer,
          item: line.item,
          description: line.description,
          status: order.status,
          orderedQuantity: this.decimalText(orderedQuantity),
          deliveredQuantity: this.decimalText(deliveredQuantity),
          backorderQuantity: this.decimalText(backorderQuantity),
          reservedQuantity: String(line.reservedQuantity),
          expectedDeliveryDate: order.expectedDeliveryDate
        };
      });
      const orderedQuantity = lines.reduce((sum, line) => sum + Number(line.orderedQuantity), 0);
      const deliveredQuantity = lines.reduce((sum, line) => sum + Number(line.deliveredQuantity), 0);
      const backorderQuantity = lines.reduce((sum, line) => sum + Number(line.backorderQuantity), 0);
      return {
        id: order.id,
        orderNo: order.orderNo,
        customer: order.customer,
        status: order.status,
        orderedQuantity: this.decimalText(orderedQuantity),
        deliveredQuantity: this.decimalText(deliveredQuantity),
        backorderQuantity: this.decimalText(backorderQuantity),
        expectedDeliveryDate: order.expectedDeliveryDate,
        lines
      };
    });

    const backorderLines = orderSummaries.flatMap((order) => order.lines.filter((line) => Number(line.backorderQuantity) > 0));
    return {
      summary: {
        openOrders: orderSummaries.filter((order) => Number(order.backorderQuantity) > 0).length,
        partiallyDeliveredOrders: orderSummaries.filter((order) => order.status === "PARTIALLY_DELIVERED").length,
        deliveredOrders: orderSummaries.filter((order) => order.status === "DELIVERED").length,
        backorderLines: backorderLines.length,
        totalBackorderQuantity: this.decimalText(backorderLines.reduce((sum, line) => sum + Number(line.backorderQuantity), 0))
      },
      orders: orderSummaries,
      backorderLines
    };
  }

  async createDelivery(companyId: string, userId: string, dto: CreateDeliveryDto) {
    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: { id: dto.salesOrderId, companyId },
      include: { lines: { include: { item: true, deliveryLines: true } } }
    });
    if (!salesOrder) throw new BadRequestException("Sales order was not found");
    if (!["CONFIRMED", "PARTIALLY_DELIVERED"].includes(salesOrder.status)) {
      throw new BadRequestException("Only confirmed or partially delivered sales orders can be delivered");
    }

    const requested = new Map((dto.lines ?? []).map((line) => [line.salesOrderLineId, this.parsePositiveDecimal(line.quantity, "quantity")]));
    const lines = salesOrder.lines.map((line) => {
      const alreadyDelivered = line.deliveryLines.reduce((sum, deliveryLine) => sum + Number(deliveryLine.quantity), 0);
      const remaining = Number(line.quantity) - alreadyDelivered;
      const quantity = requested.size > 0 ? requested.get(line.id) ?? 0 : remaining;
      return { line, quantity, remaining };
    }).filter((line) => line.quantity > 0);

    if (lines.length === 0) throw new BadRequestException("No deliverable lines were provided");
    for (const entry of lines) {
      if (entry.quantity > entry.remaining) throw new BadRequestException(`Delivery quantity exceeds remaining quantity for ${entry.line.description}`);
    }

    const deliveryNo = await this.nextDocumentNo(companyId, "delivery", "DN");
    const delivery = await this.prisma.$transaction(async (tx) => {
      const deliveryQuantities = new Map(lines.map((entry) => [entry.line.id, entry.quantity]));
      const created = await tx.delivery.create({
        data: {
          companyId,
          deliveryNo,
          salesOrderId: salesOrder.id,
          status: "POSTED",
          notes: dto.notes?.trim() || undefined,
          lines: {
            create: lines.map((entry) => ({
              salesOrderLineId: entry.line.id,
              itemId: entry.line.itemId,
              description: entry.line.description,
              quantity: this.decimalText(entry.quantity)
            }))
          }
        },
        include: { lines: true }
      });

      for (const entry of lines) {
        await tx.salesOrderLine.update({
          where: { id: entry.line.id },
          data: { reservedQuantity: this.decimalText(Math.max(Number(entry.line.reservedQuantity) - entry.quantity, 0)) }
        });

        if (!entry.line.item || !STOCK_MANAGED_TYPES.has(entry.line.item.itemType.trim().toLowerCase())) continue;
        if (!entry.line.item.warehouseId) throw new BadRequestException(`Item ${entry.line.item.code} has no default warehouse`);

        const balance = await tx.stockBalance.findUnique({
          where: {
            companyId_itemId_warehouseId: {
              companyId,
              itemId: entry.line.item.id,
              warehouseId: entry.line.item.warehouseId
            }
          }
        });
        if (!balance || Number(balance.quantityOnHand) < entry.quantity) {
          throw new BadRequestException(`Insufficient stock for ${entry.line.item.code}`);
        }

        const balanceAfter = Number(balance.quantityOnHand) - entry.quantity;
        await tx.stockBalance.update({
          where: { id: balance.id },
          data: { quantityOnHand: this.decimalText(balanceAfter) }
        });
        await tx.stockLedgerEntry.create({
          data: {
            companyId,
            itemId: entry.line.item.id,
            warehouseId: entry.line.item.warehouseId,
            movementType: "OUT",
            sourceType: "DELIVERY",
            sourceDocumentId: created.deliveryNo,
            quantityIn: "0",
            quantityOut: this.decimalText(entry.quantity),
            unitCost: String(balance.averageCost),
            valuationAmount: this.decimalText(entry.quantity * Number(balance.averageCost)),
            balanceAfter: this.decimalText(balanceAfter),
            remarks: `Delivery for ${salesOrder.orderNo}`,
            postedById: userId
          }
        });
      }

      const fulfilment = salesOrder.lines.map((line) => {
        const deliveredBefore = line.deliveryLines.reduce((sum, deliveryLine) => sum + Number(deliveryLine.quantity), 0);
        return {
          orderedQuantity: Number(line.quantity),
          deliveredQuantity: deliveredBefore + (deliveryQuantities.get(line.id) ?? 0)
        };
      });
      const orderedQuantity = fulfilment.reduce((sum, line) => sum + line.orderedQuantity, 0);
      const deliveredQuantity = fulfilment.reduce((sum, line) => sum + Math.min(line.deliveredQuantity, line.orderedQuantity), 0);
      const nextStatus = deliveredQuantity >= orderedQuantity ? "DELIVERED" : deliveredQuantity > 0 ? "PARTIALLY_DELIVERED" : "CONFIRMED";
      await tx.salesOrder.update({ where: { id: salesOrder.id }, data: { status: nextStatus } });

      return created;
    });
    await this.audit.record({ companyId, userId, action: "post_delivery", module: "sales", recordType: "Delivery", recordId: delivery.id, afterValue: delivery });
    return delivery;
  }

  async createInvoice(companyId: string, userId: string, dto: CreateSalesInvoiceDto) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id: dto.salesOrderId, companyId },
      include: { customer: true, lines: true }
    });
    if (!order) throw new BadRequestException("Sales order was not found");
    if (!["CONFIRMED", "PARTIALLY_DELIVERED", "DELIVERED"].includes(order.status)) {
      throw new BadRequestException("Only confirmed or delivered sales orders can be invoiced");
    }
    const invoice = await this.prisma.salesInvoice.create({
      data: {
        companyId,
        invoiceNo: await this.nextDocumentNo(companyId, "salesInvoice", "INV"),
        customerId: order.customerId,
        salesOrderId: order.id,
        status: "ISSUED",
        dueDate: this.parseOptionalDate(dto.dueDate),
        subtotal: order.subtotal,
        taxTotal: order.taxTotal,
        total: order.total,
        notes: dto.notes?.trim() || `Invoice for ${order.orderNo}`,
        lines: {
          create: order.lines.map((line) => ({
            salesOrderLineId: line.id,
            itemId: line.itemId,
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            discountPercent: String(line.discountPercent),
            taxRate: String(line.taxRate),
            lineTotal: String(line.lineTotal)
          }))
        }
      },
      include: { lines: true, customer: { select: { code: true, name: true } }, salesOrder: { select: { orderNo: true } } }
    });
    await this.audit.record({ companyId, userId, action: "issue_invoice", module: "sales", recordType: "SalesInvoice", recordId: invoice.id, afterValue: invoice });
    return invoice;
  }

  async createReceipt(companyId: string, userId: string, dto: CreateReceiptDto) {
    const invoice = await this.prisma.salesInvoice.findFirst({ where: { id: dto.salesInvoiceId, companyId } });
    if (!invoice) throw new BadRequestException("Sales invoice was not found");
    const amount = this.parsePositiveDecimal(dto.amount, "amount");
    const outstanding = Number(invoice.total) - Number(invoice.paidAmount);
    if (amount > outstanding) throw new BadRequestException("Receipt amount exceeds invoice outstanding amount");
    const receipt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.receipt.create({
        data: {
          companyId,
          receiptNo: await this.nextDocumentNo(companyId, "receipt", "REC"),
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,
          amount: this.decimalText(amount),
          method: dto.method?.trim().toUpperCase() || "BANK",
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined
        },
        include: { salesInvoice: { select: { invoiceNo: true } }, customer: { select: { code: true, name: true } } }
      });
      const paidAmount = Number(invoice.paidAmount) + amount;
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: this.decimalText(paidAmount),
          status: paidAmount >= Number(invoice.total) ? "PAID" : "PARTIALLY_PAID"
        }
      });
      return created;
    });
    await this.audit.record({ companyId, userId, action: "post_receipt", module: "sales", recordType: "Receipt", recordId: receipt.id, afterValue: receipt });
    return receipt;
  }

  async createCreditNote(companyId: string, userId: string, dto: CreateCreditNoteDto) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: dto.salesInvoiceId, companyId },
      include: { lines: true }
    });
    if (!invoice) throw new BadRequestException("Sales invoice was not found");
    const lineDtos = dto.lines ?? invoice.lines.map((line) => ({
      itemId: line.itemId ?? undefined,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      discountPercent: "0",
      taxRate: String(line.taxRate)
    }));
    const totals = await this.prepareLines(companyId, lineDtos);
    const creditNote = await this.prisma.$transaction(async (tx) => {
      const created = await tx.creditNote.create({
        data: {
          companyId,
          creditNoteNo: await this.nextDocumentNo(companyId, "creditNote", "CN"),
          customerId: invoice.customerId,
          salesInvoiceId: invoice.id,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          reason: dto.reason?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          lines: {
            create: totals.lines.map((line) => ({
              itemId: line.itemId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal
            }))
          }
        },
        include: { lines: true, salesInvoice: { select: { invoiceNo: true } }, customer: { select: { code: true, name: true } } }
      });
      const creditedTotal = await tx.creditNote.aggregate({
        where: { salesInvoiceId: invoice.id },
        _sum: { total: true }
      });
      const credited = Number(creditedTotal._sum.total ?? 0);
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: credited >= Number(invoice.total) ? "CREDITED" : "PARTIALLY_CREDITED" }
      });
      return created;
    });
    await this.audit.record({ companyId, userId, action: "issue_credit_note", module: "sales", recordType: "CreditNote", recordId: creditNote.id, afterValue: creditNote });
    return creditNote;
  }

  async createReturn(companyId: string, userId: string, dto: CreateSalesReturnDto) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id: dto.salesOrderId, companyId },
      include: { customer: true, lines: { include: { item: true } } }
    });
    if (!order) throw new BadRequestException("Sales order was not found");
    const requested = new Map(dto.lines.map((line) => [line.salesOrderLineId, this.parsePositiveDecimal(line.quantity, "quantity")]));
    const lines = order.lines.map((line) => ({ line, quantity: requested.get(line.id) ?? 0 })).filter((entry) => entry.quantity > 0);
    if (lines.length === 0) throw new BadRequestException("No return lines were provided");
    for (const entry of lines) {
      if (entry.quantity > Number(entry.line.quantity)) throw new BadRequestException(`Return quantity exceeds ordered quantity for ${entry.line.description}`);
    }
    const salesReturn = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salesReturn.create({
        data: {
          companyId,
          returnNo: await this.nextDocumentNo(companyId, "salesReturn", "SR"),
          customerId: order.customerId,
          salesOrderId: order.id,
          reason: dto.reason?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
          lines: {
            create: lines.map((entry) => ({
              salesOrderLineId: entry.line.id,
              itemId: entry.line.itemId,
              description: entry.line.description,
              quantity: this.decimalText(entry.quantity)
            }))
          }
        },
        include: { lines: true, salesOrder: { select: { orderNo: true } }, customer: { select: { code: true, name: true } } }
      });

      for (const entry of lines) {
        if (!entry.line.item || !STOCK_MANAGED_TYPES.has(entry.line.item.itemType.trim().toLowerCase())) continue;
        if (!entry.line.item.warehouseId) throw new BadRequestException(`Item ${entry.line.item.code} has no default warehouse`);
        const balance = await tx.stockBalance.findUnique({
          where: { companyId_itemId_warehouseId: { companyId, itemId: entry.line.item.id, warehouseId: entry.line.item.warehouseId } }
        });
        const balanceAfter = Number(balance?.quantityOnHand ?? 0) + entry.quantity;
        const updatedBalance = balance
          ? await tx.stockBalance.update({ where: { id: balance.id }, data: { quantityOnHand: this.decimalText(balanceAfter) } })
          : await tx.stockBalance.create({
              data: {
                companyId,
                itemId: entry.line.item.id,
                warehouseId: entry.line.item.warehouseId,
                quantityOnHand: this.decimalText(balanceAfter),
                averageCost: entry.line.item.purchasePrice
              }
            });
        await tx.stockLedgerEntry.create({
          data: {
            companyId,
            itemId: entry.line.item.id,
            warehouseId: entry.line.item.warehouseId,
            movementType: "IN",
            sourceType: "SALES_RETURN",
            sourceDocumentId: created.returnNo,
            quantityIn: this.decimalText(entry.quantity),
            quantityOut: "0",
            unitCost: String(updatedBalance.averageCost),
            valuationAmount: this.decimalText(entry.quantity * Number(updatedBalance.averageCost)),
            balanceAfter: this.decimalText(balanceAfter),
            remarks: `Return for ${order.orderNo}`,
            postedById: userId
          }
        });
      }

      return created;
    });
    await this.audit.record({ companyId, userId, action: "post_return", module: "sales", recordType: "SalesReturn", recordId: salesReturn.id, afterValue: salesReturn });
    return salesReturn;
  }

  private async prepareLines(companyId: string, lines: SalesLineDto[]) {
    const prepared = [];
    let subtotal = 0;
    let taxTotal = 0;
    for (const line of lines) {
      const quantity = this.parsePositiveDecimal(line.quantity, "quantity");
      const unitPrice = this.parseNonNegativeDecimal(line.unitPrice, "unitPrice");
      const discountPercent = this.parseNonNegativeDecimal(line.discountPercent ?? "0", "discountPercent");
      const taxRate = this.parseNonNegativeDecimal(line.taxRate ?? "0", "taxRate");
      if (discountPercent > 100 || taxRate > 100) throw new BadRequestException("Discount and tax rates must be between 0 and 100");
      if (line.itemId) await this.assertItem(companyId, line.itemId);
      const net = quantity * unitPrice * (1 - discountPercent / 100);
      const tax = net * (taxRate / 100);
      subtotal += net;
      taxTotal += tax;
      prepared.push({
        itemId: line.itemId,
        description: line.description.trim(),
        quantity: this.decimalText(quantity),
        unitPrice: this.decimalText(unitPrice),
        discountPercent: this.decimalText(discountPercent),
        taxRate: this.decimalText(taxRate),
        lineTotal: this.decimalText(net + tax)
      });
    }
    return { lines: prepared, subtotal: this.decimalText(subtotal), taxTotal: this.decimalText(taxTotal), total: this.decimalText(subtotal + taxTotal) };
  }

  private async reserveLines(companyId: string, lines: Array<{ itemId?: string; quantity: string; description: string; unitPrice: string; discountPercent: string; taxRate: string; lineTotal: string }>) {
    const reserved = [];
    for (const line of lines) {
      let reservedQuantity = "0";
      if (line.itemId) {
        const item = await this.prisma.item.findFirst({ where: { id: line.itemId, companyId } });
        if (item && STOCK_MANAGED_TYPES.has(item.itemType.trim().toLowerCase())) {
          if (!item.warehouseId) throw new BadRequestException(`Item ${item.code} has no default warehouse`);
          const balance = await this.prisma.stockBalance.findUnique({
            where: { companyId_itemId_warehouseId: { companyId, itemId: item.id, warehouseId: item.warehouseId } }
          });
          if (!balance || Number(balance.quantityOnHand) < Number(line.quantity)) throw new BadRequestException(`Insufficient stock to reserve ${item.code}`);
          reservedQuantity = line.quantity;
        }
      }
      reserved.push({ ...line, reservedQuantity });
    }
    return reserved;
  }

  private async nextDocumentNo(companyId: string, model: "lead" | "opportunity" | "quotation" | "salesOrder" | "delivery" | "activity" | "customerEnquiry" | "salesInvoice" | "receipt" | "creditNote" | "salesReturn", prefix: string) {
    const count =
      model === "lead"
        ? await this.prisma.lead.count({ where: { companyId } })
        : model === "opportunity"
          ? await this.prisma.opportunity.count({ where: { companyId } })
          : model === "quotation"
            ? await this.prisma.quotation.count({ where: { companyId } })
            : model === "salesOrder"
              ? await this.prisma.salesOrder.count({ where: { companyId } })
              : model === "delivery"
                ? await this.prisma.delivery.count({ where: { companyId } })
                : model === "activity"
                  ? await this.prisma.activity.count({ where: { companyId } })
                  : model === "customerEnquiry"
                    ? await this.prisma.customerEnquiry.count({ where: { companyId } })
                    : model === "salesInvoice"
                      ? await this.prisma.salesInvoice.count({ where: { companyId } })
                      : model === "receipt"
                        ? await this.prisma.receipt.count({ where: { companyId } })
                        : model === "creditNote"
                          ? await this.prisma.creditNote.count({ where: { companyId } })
                          : await this.prisma.salesReturn.count({ where: { companyId } });
    return `${prefix}-${String(count + 1).padStart(5, "0")}`;
  }

  private async assertCustomer(companyId: string, id: string) {
    const record = await this.prisma.customer.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("Customer was not found");
  }

  private async assertLead(companyId: string, id: string) {
    const record = await this.prisma.lead.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("Lead was not found");
  }

  private async assertOpportunity(companyId: string, id: string) {
    const record = await this.prisma.opportunity.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("Opportunity was not found");
  }

  private async assertQuotation(companyId: string, id: string) {
    const record = await this.prisma.quotation.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("Quotation was not found");
  }

  private async assertEnquiry(companyId: string, id: string) {
    const record = await this.prisma.customerEnquiry.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("Customer enquiry was not found");
  }

  private async assertSalesOrder(companyId: string, id: string) {
    const record = await this.prisma.salesOrder.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!record) throw new BadRequestException("Sales order was not found");
  }

  private async assertItem(companyId: string, id: string) {
    const record = await this.prisma.item.findFirst({ where: { id, companyId, isActive: true }, select: { id: true } });
    if (!record) throw new BadRequestException("Item was not found or inactive");
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

  private decimalText(value: string | number) {
    const parsed = typeof value === "number" ? value : this.parseNonNegativeDecimal(value, "amount");
    return new Prisma.Decimal(parsed.toFixed(4)).toString();
  }
}
