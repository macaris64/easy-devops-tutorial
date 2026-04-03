# Admin SPA: build microfrontend packages then the shell (multi-stage).
FROM node:20-bookworm AS builder

WORKDIR /build/frontend-b
COPY services/frontend-b/package.json services/frontend-b/package-lock.json ./
RUN npm ci
COPY services/frontend-b/ ./
RUN npm run build

WORKDIR /build/frontend-c
COPY services/frontend-c/package.json services/frontend-c/package-lock.json ./
RUN npm ci
COPY services/frontend-c/ ./
RUN npm run build

WORKDIR /build/frontend-a
COPY services/frontend-a/package.json services/frontend-a/package-lock.json ./
RUN npm ci
COPY services/frontend-a/ ./
ARG VITE_API_PREFIX=/api
ENV VITE_API_PREFIX=${VITE_API_PREFIX}
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY services/frontend-a/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/frontend-a/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
