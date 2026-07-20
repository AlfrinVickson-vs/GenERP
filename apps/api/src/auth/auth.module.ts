import { Module, forwardRef } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { FieldCryptoService } from "./security/field-crypto.service";

@Module({
  imports: [AuditModule, forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [AuthService, FieldCryptoService],
  exports: [AuthService, FieldCryptoService]
})
export class AuthModule {}
