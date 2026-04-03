# User panel microfrontend: Storybook static site (multi-stage).
FROM node:20-bookworm AS builder
WORKDIR /app
COPY services/frontend-c/package.json services/frontend-c/package-lock.json ./
RUN npm ci
COPY services/frontend-c/ ./
RUN npm run build-storybook

FROM nginx:1.27-alpine AS runner
COPY services/frontend-c/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/storybook-static /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
