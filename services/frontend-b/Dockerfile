# Log panel microfrontend: Storybook static site (multi-stage).
FROM node:20-bookworm AS builder
WORKDIR /app
COPY services/frontend-b/package.json services/frontend-b/package-lock.json ./
RUN npm ci
COPY services/frontend-b/ ./
RUN npm run build-storybook

FROM nginx:1.27-alpine AS runner
COPY services/frontend-b/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/storybook-static /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
