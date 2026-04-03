# Service-A: multi-stage TypeScript build + slim runtime image
FROM node:20-bookworm AS builder
WORKDIR /app
COPY services/service-a/package.json services/service-a/package-lock.json ./
RUN npm ci
COPY services/service-a/tsconfig.json ./
COPY services/service-a/src ./src
COPY services/common/protos ./protos
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV USER_PROTO_ROOT=/app/protos
COPY services/service-a/package.json services/service-a/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY services/common/protos ./protos
EXPOSE 3000
CMD ["node", "dist/index.js"]
