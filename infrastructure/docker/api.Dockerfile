FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN npm install
COPY apps/api apps/api
COPY tsconfig.base.json .
RUN npm run build -w @erp/security && npm run build -w @erp/types && npm run build -w @erp/validation && npm run build -w @erp/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/packages packages
USER node
CMD ["node", "apps/api/dist/main.js"]
