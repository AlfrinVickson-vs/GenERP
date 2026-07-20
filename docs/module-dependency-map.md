# Module Dependency Map

```mermaid
graph TD
  Config --> Prisma
  Prisma --> Audit
  Prisma --> Auth
  Prisma --> Users
  Prisma --> Roles
  Prisma --> Company
  Prisma --> Organisation
  Auth --> Users
  Auth --> Audit
  Roles --> Audit
  Company --> Audit
  Organisation --> Audit
  Dashboard --> Prisma
  Dashboard --> Auth
  Worker --> Config
  Worker --> Redis
```

Rules:

- Controllers depend on services, not repositories directly.
- Services own business logic and transaction boundaries.
- Guards enforce authentication and permissions before controller handlers run.
- Audit logging is append-only and called by services after meaningful state changes.
- Shared packages contain constants and schemas only; they do not import application code.
