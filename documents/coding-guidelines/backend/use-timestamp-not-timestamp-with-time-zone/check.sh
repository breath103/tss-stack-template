#!/usr/bin/env bash
# Rule: Use `timestamp` not `timestamp with time zone` (or `timestamptz`).
# Flags timezone-aware timestamp column types in migrations.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

hits="$(grep -rniE 'timestamp with time zone|timestamptz' --include='*.sql' packages/backend/supabase/migrations || true)"

if [[ -n "$hits" ]]; then
  echo "$hits"
  echo "→ Use plain \`timestamp\` — the app always passes UTC ISO strings."
  exit 1
fi
exit 0
