import { ArrayMaxSize, IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength, Matches, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateOpeningStockDto {
  @IsString()
  itemId!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  quantity!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  unitCost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remarks?: string;
}

export class CreateStockTransferDto {
  @IsString()
  itemId!: string;

  @IsString()
  fromWarehouseId!: string;

  @IsString()
  toWarehouseId!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  quantity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remarks?: string;
}

export class StockCountLineDto {
  @IsString()
  itemId!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  countedQuantity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remarks?: string;
}

export class CreateStockCountDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  countedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockCountLineDto)
  lines!: StockCountLineDto[];
}

export class StockAdjustmentLineDto {
  @IsString()
  itemId!: string;

  @IsString()
  @IsIn(["IN", "OUT"])
  movementType!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  quantity!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  unitCost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remarks?: string;
}

export class CreateStockAdjustmentDto {
  @IsString()
  warehouseId!: string;

  @IsString()
  @MaxLength(80)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockAdjustmentLineDto)
  lines!: StockAdjustmentLineDto[];
}

export class ImportInventoryDto {
  @IsIn(["transfers", "counts", "adjustments"])
  target!: "transfers" | "counts" | "adjustments";

  @IsObject()
  mapping!: Record<string, string>;

  @IsArray()
  @ArrayMaxSize(500)
  rows!: Array<Record<string, unknown>>;
}
