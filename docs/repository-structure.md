# Repository Folder Structure

```text
apps/
  api/        NestJS REST API
  web/        Next.js frontend
  worker/     BullMQ worker
packages/
  config/     Shared config defaults
  security/   Permissions and masking helpers
  types/      Shared TypeScript contracts
  ui/         Shared UI placeholder package
  validation/ Shared Zod schemas
database/
  migrations/ Prisma migration output target
  seeds/      Seed reference files
  backups/    Local backup output
infrastructure/
  docker/     Dockerfiles
  nginx/      Reverse proxy config
docs/         Product and engineering documentation
tests/        Cross-app acceptance notes and future E2E tests
```
