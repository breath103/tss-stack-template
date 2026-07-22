#!/usr/bin/env bash
# Rule: CSS modules reference Tailwind via @reference "../../global.css" — never @import "tailwindcss".
# Flags @import "tailwindcss" and @reference "tailwindcss" inside *.module.css.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

hits="$(grep -rnE '@(import|reference)[[:space:]]+"tailwindcss"' --include='*.module.css' packages/frontend/src || true)"

if [[ -n "$hits" ]]; then
  echo "$hits"
  echo "→ Use @reference \"../../global.css\" so custom tokens resolve and no CSS is re-emitted."
  exit 1
fi
exit 0
