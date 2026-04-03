#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
go test ./internal/... -coverprofile=coverage.out -covermode=atomic
# Exclude generated protos and GORM model structs from the aggregate (not unit-tested directly).
grep -vE '/internal/genpb/|/internal/model/' coverage.out > coverage.filtered.out || cp coverage.out coverage.filtered.out
pct=$(go tool cover -func=coverage.filtered.out | awk '/^total:/{gsub("%",""); print $3}')
awk -v p="$pct" 'BEGIN {
  if (p+0 < 80) { print "coverage " p "% is below 80%"; exit 1 }
  print "coverage " p "% OK (min 80%; excluding genpb+model from aggregate)"
}'
