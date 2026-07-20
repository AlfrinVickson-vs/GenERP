import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedRequest } from "../common/request-user";
import { Public } from "./decorators/public.decorator";
import { LoginDto } from "./dto/login.dto";
import { MfaVerifyDto } from "./dto/mfa.dto";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService
  ) {}

  @Public()
  @Post("login")
  async login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateLogin(dto.identifier, dto.password, dto.totpCode, {
      ip: req.ip,
      userAgent: String(req.headers["user-agent"] ?? "")
    });
    const token = this.auth.signSession({ sub: user.id, companyId: user.companyId });
    res.cookie(this.auth.cookieName, token, this.auth.cookieOptions());
    await this.audit.record({
      companyId: user.companyId,
      userId: user.id,
      action: "login",
      module: "auth",
      recordType: "User",
      recordId: user.id,
      ipAddress: req.ip,
      userAgent: String(req.headers["user-agent"] ?? "")
    });
    return this.auth.buildApiUser(user.id);
  }

  @Get("me")
  async me(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @Post("logout")
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.auth.cookieName, { path: "/" });
    if (req.user) {
      await this.audit.record({
        companyId: req.user.companyId,
        userId: req.user.id,
        action: "logout",
        module: "auth",
        recordType: "User",
        recordId: req.user.id,
        ipAddress: req.ip,
        userAgent: String(req.headers["user-agent"] ?? "")
      });
    }
    return { ok: true };
  }

  @Post("mfa/setup")
  async setupMfa(@Req() req: AuthenticatedRequest) {
    return this.auth.startMfaSetup(req.user!.id);
  }

  @Post("mfa/enable")
  async enableMfa(@Req() req: AuthenticatedRequest, @Body() dto: MfaVerifyDto) {
    return this.auth.enableMfa(req.user!.id, dto.code);
  }
}
