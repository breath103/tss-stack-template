#!/usr/bin/env bash
# Rule: one cohesive scenario per surface — don't proliferate e2e files.
# Flags any surface (first `-`-delimited token of the scenario filename) that has
# more than LIMIT scenario files. Helpers (_*.ts) and config are excluded.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

LIMIT=8

hits=""
while read -r count surface; do
  if (( count > LIMIT )); then
    hits="${hits}  ${surface}: ${count} scenario files"$'\n'
  fi
done < <(
  for f in e2e/*.ts; do
    b="$(basename "$f" .ts)"
    [[ "$b" == _* || "$b" == "eslint.config" ]] && continue
    echo "${b%%-*}"
  done | sort | uniq -c
)

if [[ -n "$hits" ]]; then
  printf '%s' "$hits"
  echo "→ This surface has too many scenario files — consolidate into one cohesive harness() per surface."
  exit 1
fi
exit 0
