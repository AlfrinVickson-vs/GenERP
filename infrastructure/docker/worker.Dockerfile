FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/worker/package.json apps/worker/package.json
RUN npm install
COPY apps/worker apps/worker
COPY tsconfig.base.json .
RUN npm run build -w @erp/worker

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/worker/dist apps/worker/dist
COPY --from=builder /app/apps/worker/package.json apps/worker/package.json
USER node
CMD ["node", "apps/worker/dist/main.js"]
