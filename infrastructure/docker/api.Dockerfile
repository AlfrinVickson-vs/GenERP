FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps apps
COPY packages packages
COPY tsconfig.base.json ./

RUN npm ci
RUN npm run prisma:generate -w @erp/api
RUN npm run build -w @erp/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages ./packages

USER node
CMD ["npm", "run", "start", "-w", "@erp/api"]
