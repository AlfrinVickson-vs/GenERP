# Deployment

## Development

1. Copy `.env.example` to `.env` and `apps/api/.env.example` to `apps/api/.env`, then replace secrets.
2. Run `npm install`.
3. Run `docker compose up postgres redis -d`.
4. Run `npm run prisma:generate -w @erp/api`.
5. Run `npm run prisma:migrate -w @erp/api -- --name phase_1_foundation`.
6. Run `npm run prisma:seed -w @erp/api`.
7. Run `npm run dev:api`, `npm run dev:web`, and `npm run dev:worker`.

On Windows, the web scripts automatically run Next.js through a temporary clean drive path because this project folder contains `#`, which breaks Next.js module paths when run directly.

Default demo login:

- Email: `admin@eversafe-demo.test`
- Password: `Admin123!`

## Local SQLite Fallback

If Docker/PostgreSQL is not installed on a Windows development machine, the API can be run against a local SQLite database for UI verification:

1. Set `SQLITE_DATABASE_URL=file:./dev.db`.
2. Run `npm run prisma:generate:sqlite -w @erp/api`.
3. Run `npm run prisma:push:sqlite -w @erp/api`.
4. Run `npm run prisma:seed -w @erp/api`.
5. Start the API with the same `SQLITE_DATABASE_URL` environment variable.

This fallback is for local development only. Production remains PostgreSQL.

## Production

1. Provide strong secrets and production connection strings in `.env`.
2. Set `COOKIE_SECURE=true`.
3. Configure TLS in front of Nginx or terminate TLS at a managed load balancer.
4. Run `docker compose up --build -d`.
5. Run migrations before routing traffic.
6. Verify `/docs` for API documentation and service health through container logs.
7. Run a backup restore drill before accepting production data.

## Backup

The Compose backup service writes compressed PostgreSQL dumps to `database/backups`. A backup is accepted only after restoring it to a separate database and running smoke checks.
