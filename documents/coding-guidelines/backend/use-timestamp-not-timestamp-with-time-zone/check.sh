#!/usr/bin/env bash
# Rule: Use `timestamp` not `timestamp with time zone` (or `timestamptz`).
# Flags timezone-aware timestamp column types in migrations.
#
# Comments and single-quoted strings are blanked first: a column type is never
# written in either, so the only hits left are real declarations. Without that,
# a migration that *converts* these columns trips on its own prose and on the
# `data_type = 'timestamp with time zone'` it has to compare against.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

hits=""
while IFS= read -r file; do
  found="$(sed -E "s/--.*$//; s/'[^']*'//g" "$file" | grep -niE 'timestamp with time zone|timestamptz' || true)"
  [[ -n "$found" ]] && hits+="$(sed "s|^|$file:|" <<<"$found")"$'\n'
done < <(find packages/backend/migrations -name '*.sql')

if [[ -n "${hits// /}" ]]; then
  printf '%s' "$hits"
  echo "→ Use plain \`timestamp\` — the app always passes UTC ISO strings."
  exit 1
fi
exit 0
