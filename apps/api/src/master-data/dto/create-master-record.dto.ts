import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateMasterRecordDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  ratePercent?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  days?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
