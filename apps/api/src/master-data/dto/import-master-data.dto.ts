import { ArrayMaxSize, IsArray, IsIn, IsObject, IsOptional } from "class-validator";

export class ImportMasterDataDto {
  @IsIn(["customers", "suppliers", "items", "masters"])
  target!: "customers" | "suppliers" | "items" | "masters";

  @IsOptional()
  @IsIn(["customer-categories", "supplier-categories", "item-categories", "units", "tax-codes", "currencies", "payment-terms"])
  masterKind?: "customer-categories" | "supplier-categories" | "item-categories" | "units" | "tax-codes" | "currencies" | "payment-terms";

  @IsObject()
  mapping!: Record<string, string>;

  @IsArray()
  @ArrayMaxSize(500)
  rows!: Array<Record<string, unknown>>;
}
