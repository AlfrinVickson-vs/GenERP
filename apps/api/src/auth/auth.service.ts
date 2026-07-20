import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import { PrismaService } from "../prisma/prisma.service";
import { FieldCryptoService } from "./security/field-crypto.service";

const LoginResult = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  LOCKED: "LOCKED",
  MFA_REQUIRED: "MFA_REQUIRED"
} as const;

const UserStatus = {
  ACTIVE: "ACTIVE"
} as const;

export type SessionPayload = {
  sub: string;
  companyId: string;
};

@Injectable()
export class AuthService {
  private readonly sessionCookieName = "erp_session";

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: FieldCryptoService
  ) {}

  get cookieName() {
    return this.sessionCookieName;
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  signSession(payload: SessionPayload): string {
    return jwt.sign(payload, this.config.getOrThrow<string>("JWT_ACCESS_SECRET"), {
      expiresIn: "8h",
      issuer: "single-company-erp"
    });
  }

  verifySession(token: string): SessionPayload {
    return jwt.verify(token, this.config.getOrThrow<string>("JWT_ACCESS_SECRET"), {
      issuer: "single-company-erp"
    }) as SessionPayload;
  }

  cookieOptions() {
    const cookieSecure = String(this.config.get<string | boolean>("COOKIE_SECURE", false)).toLowerCase() === "true";
    return {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: cookieSecure,
      maxAge: 8 * 60 * 60 * 1000,
      path: "/"
    };
  }

  async validateLogin(identifier: string, password: string, totpCode?: string, context?: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }]
      }
    });

    if (!user) {
      await this.recordLogin(null, identifier, LoginResult.FAILED, context);
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status !== UserStatus.ACTIVE || (user.lockedUntil && user.lockedUntil > new Date())) {
      await this.recordLogin(user.id, identifier, LoginResult.LOCKED, context);
      throw new ForbiddenException("Account is not active");
    }

    const passwordValid = await this.verifyPassword(user.passwordHash, password);
    if (!passwordValid) {
      const failedLoginCount = user.failedLoginCount + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil: failedLoginCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
        }
      });
      await this.recordLogin(user.id, identifier, LoginResult.FAILED, context);
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.mfaEnabled) {
      if (!totpCode || !user.mfaSecretEncrypted) {
        await this.recordLogin(user.id, identifier, LoginResult.MFA_REQUIRED, context);
        throw new UnauthorizedException("MFA code required");
      }

      const secret = this.crypto.decrypt(user.mfaSecretEncrypted);
      if (!authenticator.verify({ token: totpCode, secret })) {
        await this.recordLogin(user.id, identifier, LoginResult.FAILED, context);
        throw new UnauthorizedException("Invalid MFA code");
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });
    await this.recordLogin(user.id, identifier, LoginResult.SUCCESS, context);

    return user;
  }

  async buildApiUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid session");
    }

    const roles = user.roles.map((entry) => entry.role.name);
    const permissions = Array.from(
      new Set(user.roles.flatMap((entry) => entry.role.permissions.map((permission) => permission.permission.code)))
    );

    return {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      roles,
      permissions
    };
  }

  async startMfaSetup(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    const encrypted = this.crypto.encrypt(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecretEncrypted: encrypted, mfaEnabled: false }
    });

    return {
      secret,
      otpauthUrl: authenticator.keyuri(user.email, "Single Company ERP", secret)
    };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecretEncrypted) {
      throw new ForbiddenException("MFA setup has not been started");
    }

    const secret = this.crypto.decrypt(user.mfaSecretEncrypted);
    if (!authenticator.verify({ token: code, secret })) {
      throw new UnauthorizedException("Invalid MFA code");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });
    return { enabled: true };
  }

  private async recordLogin(
    userId: string | null,
    identifier: string,
    result: (typeof LoginResult)[keyof typeof LoginResult],
    context?: { ip?: string; userAgent?: string }
  ) {
    await this.prisma.loginHistory.create({
      data: {
        userId,
        identifier,
        result,
        ipAddress: context?.ip,
        userAgent: context?.userAgent
      }
    });
  }
}
