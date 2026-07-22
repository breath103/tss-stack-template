#!/usr/bin/env bash
# Rule: Never use Unicode glyphs (✕ ✓ ⌃ ▾ ✗ ▸ ▴ ◂) as the visible label of a
# JSX <button>/<a>. Use a @phosphor-icons/react icon component.
#
# Targeted regex: a JSX `>` immediately followed by one of the banned glyphs,
# closing tag. Catches the common `>✕</button>` and `>▾</button>` shape
# without false-positiving on arrows inside body copy / sentence fragments.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

hits="$(grep -rnE '>(✕|✗|✓|⌃|⌄|▾|▴|◂|▸|×)</' --include='*.tsx' packages/frontend/src || true)"

# Affordance glyphs baked into label strings — i18n dict values that start
# with "+ " or end with a menu/close glyph, and inline text="+ …" props.
# These are icons drawn with characters; use Button content="icon"/"icon-text".
label_hits="$(grep -rnE '": "\+ ' --include='*.i18n.json' packages/frontend/src || true)"
label_hits+="$(grep -rnE '(▾|⌄|▸|✕|×)",?$' --include='*.i18n.json' packages/frontend/src || true)"
label_hits+="$(grep -rnE 'text="\+ ' --include='*.tsx' packages/frontend/src || true)"

if [[ -n "$hits$label_hits" ]]; then
  [[ -n "$hits" ]] && echo "$hits"
  [[ -n "$label_hits" ]] && echo "$label_hits"
  echo "→ Replace the glyph with a @phosphor-icons/react icon (e.g. <X className=\"size-4\" />, Button content=\"icon-text\" icon={Plus})."
  exit 1
fi
exit 0
