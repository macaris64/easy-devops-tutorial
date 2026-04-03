# frontend-a (admin shell)

Vite + React admin SPA. Imports `@easy-devops/log-panel` and `@easy-devops/user-panel`. In Docker, nginx serves the SPA and proxies `/api/*` to `service-a:3000`.

| Area | Notes |
| ---- | ----- |
| API  | `VITE_API_PREFIX` defaults to `/api` (Vite dev proxy + nginx in prod) |
