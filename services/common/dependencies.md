# Common (shared contracts)

| Tool / layout | Role |
|---------------|------|
| [Buf](https://buf.build) (`buf.yaml`) | Lint, build, and breaking-change checks for `.proto` files |
| `protos/user/v1/user.proto` | gRPC contract (`user.v1.UserService`) consumed by Service-A and Service-B |
| `scripts/validate-protos.sh` | Local CI parity: `buf lint`, `buf build`, `buf format -d --exit-code` |

Install the Buf CLI for local validation. GitHub Actions runs the same checks in `.github/workflows/proto.yml` (plus `buf breaking` on pull requests).
