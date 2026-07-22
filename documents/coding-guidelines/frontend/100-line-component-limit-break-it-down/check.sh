#!/usr/bin/env bash
# Rule: ~100-line component smell — break big components down.
#
# The doc threshold is a *soft* ~100 ("sometimes 130 is right"). This gate has
# two independent fails, because a file gets too big in two distinct ways:
#
#   1. ONE oversized component — largest top-level component/function span > 150.
#   2. A LONG FILE STUFFED WITH MANY COMPONENTS — total file lines >= 200 AND
#      >= 8 top-level components. The line-span check (#1) is blind to this: each
#      component is individually small, so it passes, yet the file is really a
#      module pretending to be a component file. Per the rule, when a file grows
#      several components, it must become `Foo.tsx` + a sibling `Foo/` folder
#      (one component per file). 8 components in a 200+ line file IS that case.
#      (The 200-line floor keeps small shadcn primitive bundles — command/dialog
#      with 9-10 tiny components in <190 lines — out of scope.)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

SPAN_LIMIT=150
FILE_LINES=200
FILE_COMPONENTS=8

span_hits=""
folder_hits=""
while IFS= read -r f; do
  # Largest span between top-level declarations (column-0 function/const/class).
  max="$(awk '
    /^(export )?(export default )?(async )?(function|const|class) [A-Za-z]/ {
      if (prev) { span = NR - prev; if (span > maxspan) maxspan = span }
      prev = NR
    }
    END { if (prev) { span = NR - prev + 1; if (span > maxspan) maxspan = span } print maxspan + 0 }
  ' "$f")"
  if (( max > SPAN_LIMIT )); then
    span_hits="${span_hits}${f}: largest component ${max} lines"$'\n'
  fi

  lines="$(wc -l < "$f")"
  # Top-level component decls: `function Pascal` / `const Pascal = (` / `= memo(`.
  comps="$(grep -cE '^(export )?(export default )?function [A-Z]|^(export )?const [A-Z][A-Za-z0-9]* = (memo\(|\(|React\.memo)' "$f" || true)"
  if (( lines >= FILE_LINES && comps >= FILE_COMPONENTS )); then
    folder_hits="${folder_hits}${f}: ${lines} lines, ${comps} top-level components"$'\n'
  fi
done < <(find packages/frontend/src -name '*.tsx')

status=0
if [[ -n "$span_hits" ]]; then
  printf '%s' "$span_hits"
  echo "→ A single component exceeds ${SPAN_LIMIT} lines — break it into smaller named pieces (colocated or sibling files)."
  status=1
fi
if [[ -n "$folder_hits" ]]; then
  printf '%s' "$folder_hits"
  echo "→ A long file (>= ${FILE_LINES} lines) holds >= ${FILE_COMPONENTS} components — split it into 'Foo.tsx' + a sibling 'Foo/' folder, one component per file."
  status=1
fi
exit $status
