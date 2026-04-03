# Service-A dependencies

| Package | Role |
|---------|------|
| `express` | HTTP API (`POST /users`, `GET /health`) |
| `@grpc/grpc-js` | gRPC client to Service-B |
| `@grpc/proto-loader` | Load `user.proto` at runtime |
| `mongoose` | MongoDB audit log persistence |

Dev / tooling: `typescript`, `jest`, `ts-jest`, `supertest`, `eslint`, `typescript-eslint`, `stylelint`, `stylelint-config-standard`.
