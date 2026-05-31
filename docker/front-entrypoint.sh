#!/bin/sh
set -e

# Runs (via nginx's /docker-entrypoint.d/ hook) before nginx starts.
# Auto-generates env-config.js from EVERY VITE_-prefixed runtime env var,
# so adding a var to Dokploy is the only step — no list to maintain here.
OUT=/usr/share/nginx/html/env-config.js

{
  echo "window.__ENV__ = {"
  env | grep '^VITE_' | while IFS='=' read -r key value; do
    # Escape backslashes and double quotes for valid JS string literals.
    escaped=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')
    printf '  "%s": "%s",\n' "$key" "$escaped"
  done
  echo "};"
} > "$OUT"

echo "Generated $OUT:"
cat "$OUT"
