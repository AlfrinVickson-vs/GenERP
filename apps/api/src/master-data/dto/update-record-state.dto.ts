import { IsBoolean, IsIn } from "class-validator";

export class UpdateRecordStatusDto {
  @IsIn(["ACTIVE", "INACTIVE"])
  status!: "ACTIVE" | "INACTIVE";
}

export class UpdateRecordActiveDto {
  @IsBoolean()
  isActive!: boolean;
}
