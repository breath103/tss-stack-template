#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"
hits="$(grep -rniE 'prefers-reduced-motion|prefersReducedMotion' \
  --include='*.css' --include='*.ts' --include='*.tsx' \
  packages/frontend/src || true)"
if [[ -n "$hits" ]]; then
  echo "$hits"
  echo "→ Never accommodate reduced motion — remove the prefers-reduced-motion handling."
  exit 1
fi
