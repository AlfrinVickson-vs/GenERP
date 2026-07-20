import { IsEmail, IsInt, IsOptional, IsString, IsUrl, Max, Min, MinLength } from "class-validator";

export class UpdateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  registrationNumber?: string | null;

  @IsOptional()
  @IsString()
  taxRegistrationNumber?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsUrl()
  website?: string | null;

  @IsString()
  baseCurrency!: string;

  @IsString()
  timezone!: string;

  @IsString()
  dateFormat!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  financialYearStartMonth!: number;

  @IsOptional()
  @IsString()
  defaultTaxCode?: string | null;

  @IsOptional()
  @IsString()
  invoiceFooter?: string | null;

  @IsOptional()
  @IsString()
  termsAndConditions?: string | null;
}
