import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AuthService } from "../auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: unknown; cookies?: Record<string, string> }>();
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const token = request.cookies?.[this.auth.cookieName] ?? bearerToken;

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    let payload;
    try {
      payload = this.auth.verifySession(token);
    } catch {
      throw new UnauthorizedException("Authentication required");
    }

    request.user = await this.auth.buildApiUser(payload.sub);
    return true;
  }
}
