#!/usr/bin/env bash
# Rule: a form in a modal uses ModalForm — not a hand-rolled ModalShell/Dialog + <form>.
# Flags any frontend .tsx that (a) imports a modal primitive from
# @/components/ui/modal or @/components/ui/dialog, AND (b) renders a `<form`,
# but (c) does NOT import ModalForm. ModalForm.tsx itself is exempt (it IS the
# primitive that wraps ModalShell around a <form>).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

violations=""
# Candidates: files importing a raw modal primitive (modal or dialog).
while IFS= read -r f; do
  [[ "$f" == *"/components/ui/ModalForm.tsx" ]] && continue
  grep -qE '<form\b' "$f" || continue          # must render a form
  grep -qE 'components/ui/ModalForm' "$f" && continue  # already adopts ModalForm
  violations+="$f"$'\n'
done < <(grep -rlE 'from "@/components/ui/(modal|dialog)"' --include='*.tsx' packages/frontend/src || true)

if [[ -n "${violations//[$'\n']/}" ]]; then
  printf '%s' "$violations"
  echo "→ A form in a modal must use ModalForm (components/ui/ModalForm), opened via openModal — don't hand-roll ModalShell/Dialog + <form> + footer."
  exit 1
fi
exit 0
