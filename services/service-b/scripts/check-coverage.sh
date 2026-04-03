#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
go test ./internal/... -coverprofile=coverage.out -covermode=atomic
pct=$(go tool cover -func=coverage.out | awk '/^total:/{gsub("%",""); print $3}')
awk -v p="$pct" 'BEGIN {
  if (p+0 < 90) { print "coverage " p "% is below 90%"; exit 1 }
  print "coverage " p "% OK"
}'
