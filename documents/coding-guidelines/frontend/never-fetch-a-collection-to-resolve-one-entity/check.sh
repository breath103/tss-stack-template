#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

# The anti-pattern is a single-entity fetcher that resolves its row by pulling a
# collection and picking one out: a `useRepositoryQuery(` / `useEntity(` call whose
# fetcher awaits a collection and `.find(`s in it. Six lines spans the id argument
# and an inline fetcher without reaching the next statement.
#
# Deliberately narrow: the `.find(` must sit on the same line as the `await` that
# produced the collection. That is the idiomatic one-liner form this rule keeps
# catching, and requiring both on one line means an ordinary array `.find(` that
# merely happens to sit near a `useEntity` call doesn't block the commit. A
# split-across-lines variant slips through the gate — rule.md still governs it.
hits="$(grep -rn --include='*.ts' --include='*.tsx' -A6 -E 'use(RepositoryQuery|Entity)\(' \
  packages/frontend/src 2>/dev/null | grep -E '^\S+[-:][0-9]+[-:].*await .*\.find\(' || true)"

if [[ -n "$hits" ]]; then
  echo "$hits"
  echo "→ Resolving one entity by fetching a collection and .find()-ing it. Load that id"
  echo "  through a batched createEntityLoader + useEntity instead (see rule.md)."
  exit 1
fi
