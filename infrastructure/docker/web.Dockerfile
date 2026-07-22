FROM node:20-alpine AS builder
WORKDIR /app

ARG API_PROXY_URL
ARG NEXT_PUBLIC_API_URL
ENV API_PROXY_URL=${API_PROXY_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
COPY apps apps
COPY packages packages
COPY tsconfig.base.json ./
COPY scripts scripts

RUN npm ci
RUN npm run build -w @erp/web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/packages ./packages

USER node
CMD ["npm", "run", "start", "-w", "@erp/web"]
