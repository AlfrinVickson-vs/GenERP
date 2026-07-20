# System Architecture

## Runtime Components

- `apps/web`: Next.js frontend using React, TypeScript, Tailwind CSS, TanStack Query, and Recharts.
- `apps/api`: NestJS REST API with Swagger, Prisma, validation, authentication, RBAC guards, audit logging, and security middleware.
- `apps/worker`: BullMQ worker process for queued jobs such as notifications, backup checks, and future imports.
- `packages/types`: Shared TypeScript types.
- `packages/validation`: Shared Zod schemas.
- `packages/security`: Shared permission constants and security helpers.
- `packages/config`: Shared environment parsing defaults.
- `database`: Migration, seed, and backup documentation surface.
- `infrastructure`: Docker and Nginx assets.

## Request Flow

1. Browser sends requests to the Next.js app and API.
2. API reads the `erp_session` HttpOnly cookie.
3. Auth guard validates the JWT session and loads the user roles.
4. Permission guard checks required backend permissions.
5. Services execute business logic inside transactions where data consistency matters.
6. Audit service records append-only events.
7. API returns filtered data based on permissions.

## Security Layers

- Helmet headers and CORS allow-list.
- HttpOnly SameSite cookies.
- Argon2id password hashing.
- Permission enforcement in guards and frontend capability checks.
- Audit logging for sensitive actions.
- Field encryption helpers prepared for sensitive Phase 2+ fields.
- Rate limit and Redis-backed queue services prepared for production.
