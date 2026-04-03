# Multi-stage: protobuf codegen + static Go binary
FROM golang:1.22-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends protobuf-compiler \
  && rm -rf /var/lib/apt/lists/*

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.34.1 \
  && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.4.0

WORKDIR /src

# Build from monorepo root: shared protos + service-b
COPY services/common/protos /protos
COPY services/service-b /src

RUN mkdir -p pb && protoc \
  -I/protos \
  --go_out=pb --go_opt=paths=source_relative \
  --go-grpc_out=pb --go-grpc_opt=paths=source_relative \
  /protos/user.proto

ENV CGO_ENABLED=0
RUN go mod download \
  && go build -trimpath -ldflags="-s -w" -o /out/service-b .

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=builder /out/service-b /service-b
USER nonroot:nonroot
EXPOSE 50051
ENTRYPOINT ["/service-b"]
