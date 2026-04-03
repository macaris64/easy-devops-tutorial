#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
buf lint
buf build
buf format -d --exit-code protos
