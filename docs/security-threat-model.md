# Security Threat Model

## Assets

- User identities, sessions, password hashes, MFA secrets, company configuration, audit logs, and future financial and employee records.

## Threats and Mitigations

| Threat | Mitigation |
| --- | --- |
| Broken access control | Backend auth and permission guards on every protected route. |
| Password compromise | Argon2id hashing, account lockout counters, no password logging. |
| Session theft | HttpOnly SameSite cookies, expiration, secure-cookie option in production. |
| CSRF | SameSite cookies and explicit API origin allow-list; token hook prepared for unsafe methods. |
| SQL injection | Prisma parameterised queries and DTO validation. |
| XSS | React escaping, Helmet headers, no unsafe HTML rendering. |
| Audit tampering | No update/delete audit endpoints; database table treated append-only by API. |
| Sensitive data leakage | Masking helpers for audit payloads and encryption helper package for future fields. |
| Brute force login | Failed-login counters, lockout timestamp, and rate-limit-ready Redis service. |
| Misconfiguration | `.env.example`, production cookie and CORS settings, Docker separation. |

## Residual Phase 1 Risks

- Production email verification and password-reset delivery are stubbed for provider configuration in later hardening.
- Full CSRF token rotation should be enabled before internet exposure.
- Backup restore testing is documented and wired as a service command, but must be run against a real production-like environment.
