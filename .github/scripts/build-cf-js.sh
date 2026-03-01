#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENTRY_FILE="${ROOT_DIR}/themes/InterDead/assets/js/app.js"
OUTPUT_ROOT="${1:-${ROOT_DIR}/.cf-build}"
OUTPUT_DIR="${OUTPUT_ROOT}/js"
OUTPUT_FILE="${OUTPUT_DIR}/app.js"

if [[ ! -f "${ENTRY_FILE}" ]]; then
  echo "[InterDeadIT][CI] Entry file is missing: ${ENTRY_FILE}" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

npx --yes esbuild "${ENTRY_FILE}" \
  --bundle \
  --format=iife \
  --platform=browser \
  --target=es2018 \
  --minify \
  --legal-comments=none \
  --outfile="${OUTPUT_FILE}"

if [[ ! -s "${OUTPUT_FILE}" ]]; then
  echo "[InterDeadIT][CI] Bundle output was not created: ${OUTPUT_FILE}" >&2
  exit 1
fi

echo "[InterDeadIT][CI] Cloudflare-ready JS bundle created: ${OUTPUT_FILE}"
