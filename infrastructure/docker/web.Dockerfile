FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN npm install
COPY apps/web apps/web
COPY tsconfig.base.json .
RUN npm run build -w @erp/types && npm run build -w @erp/web

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/public apps/web/public
COPY --from=builder /app/apps/web/package.json apps/web/package.json
COPY --from=builder /app/node_modules node_modules
USER node
CMD ["npm", "run", "start", "-w", "@erp/web"]
