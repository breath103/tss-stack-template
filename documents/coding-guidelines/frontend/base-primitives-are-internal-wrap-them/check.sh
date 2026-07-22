#!/usr/bin/env bash
# Rule: base primitives (components/ui/base/) are internal. Only the wrapper
# files directly in components/ui/ may import them. Any deeper file (routes,
# contexts, or a nested ui/ subfolder) reaching into ui/base is a violation —
# it means product code is talking to a raw shadcn primitive instead of the
# curated wrapper.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

UI_DIR="packages/frontend/src/components/ui"

hits=""
while IFS= read -r f; do
  # Allowed importer: a wrapper sitting DIRECTLY in components/ui/ (the base
  # folder itself is excluded from the search below). Anything else is illegal.
  case "$f" in
    "$UI_DIR"/*/*) : ;;              # nested subfolder — not a top-level wrapper
    "$UI_DIR"/*)   continue ;;       # top-level ui/ wrapper — allowed
  esac
  hits="${hits}${f}"$'\n'
done < <(grep -rlE 'from "@/components/ui/base/' packages/frontend/src \
           --include='*.ts' --include='*.tsx' \
           | grep -v "$UI_DIR/base/" || true)

if [[ -n "$hits" ]]; then
  printf '%s' "$hits"
  echo "→ These files import a base primitive directly. Import the wrapper from"
  echo "  @/components/ui/<Name> instead — only wrappers in components/ui/ may"
  echo "  reach into components/ui/base/."
  exit 1
fi
