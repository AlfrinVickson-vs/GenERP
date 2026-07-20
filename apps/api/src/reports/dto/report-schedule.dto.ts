import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateReportScheduleDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(["dashboard", "operational", "financial"])
  kind!: "dashboard" | "operational" | "financial";

  @IsOptional()
  @IsString()
  @IsIn(["csv", "pdf"])
  format?: "csv" | "pdf";

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsEmail({}, { each: true })
  recipients!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subject?: string;

  @IsString()
  @IsIn(["DAILY", "WEEKLY", "MONTHLY"])
  frequency!: "DAILY" | "WEEKLY" | "MONTHLY";

  @IsOptional()
  @IsString()
  nextRunAt?: string;
}
