# Multi-stage: protobuf codegen (buf) + static Go binary
FROM golang:1.22-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN curl -sSL "https://github.com/bufbuild/buf/releases/download/v1.47.2/buf-Linux-x86_64.tar.gz" | tar -xz -C /usr/local --strip-components=1

WORKDIR /workspace

COPY services/common services/common
COPY services/service-b services/service-b

RUN cd services/common && buf generate

WORKDIR /workspace/services/service-b
ENV CGO_ENABLED=0
RUN go mod download \
  && go build -trimpath -ldflags="-s -w" -o /out/service-b .

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=builder /out/service-b /service-b
USER nonroot:nonroot
EXPOSE 50051
ENTRYPOINT ["/service-b"]
