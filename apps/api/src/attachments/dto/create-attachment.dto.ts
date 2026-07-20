import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAttachmentDto {
  @IsIn(["customer", "supplier", "item", "master_data"])
  recordType!: "customer" | "supplier" | "item" | "master_data";

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  recordId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @IsString()
  contentBase64!: string;
}
