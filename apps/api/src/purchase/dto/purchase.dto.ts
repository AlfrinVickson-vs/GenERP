import { ArrayMinSize, IsArray, IsOptional, IsString, Matches } from "class-validator";

export class PurchaseLineDto {
  @IsString()
  itemId!: string;

  @IsString()
  description!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  quantity!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  unitPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  taxRate?: string;
}

export class CreatePurchaseRequestDto {
  @IsOptional()
  @IsString()
  requiredDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  lines!: PurchaseLineDto[];
}

export class CreateRfqDto {
  @IsOptional()
  @IsString()
  purchaseRequestId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSupplierQuotationDto {
  @IsOptional()
  @IsString()
  rfqId?: string;

  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  leadTimeDays?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  lines!: PurchaseLineDto[];
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  purchaseRequestId?: string;

  @IsOptional()
  @IsString()
  supplierQuotationId?: string;

  @IsOptional()
  @IsString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  lines?: PurchaseLineDto[];
}

export class GoodsReceiptLineDto {
  @IsString()
  purchaseOrderLineId!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  quantity!: string;
}

export class CreateGoodsReceiptDto {
  @IsString()
  purchaseOrderId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  lines?: GoodsReceiptLineDto[];
}

export class CreateSupplierInvoiceDto {
  @IsString()
  purchaseOrderId!: string;

  @IsString()
  supplierInvoiceNo!: string;

  @IsOptional()
  @IsString()
  goodsReceiptId?: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  subtotal!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  taxTotal?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseReturnDto {
  @IsString()
  purchaseOrderId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  lines!: GoodsReceiptLineDto[];
}
