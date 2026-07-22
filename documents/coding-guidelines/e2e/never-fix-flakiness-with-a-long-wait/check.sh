#!/usr/bin/env bash
# Rule: NEVER fix flakiness with a long wait. Local dev UI/API is <100ms.
# Flags fixed sleeps — `waitForTimeout(...)` is ALWAYS wrong (wait on a real
# condition instead). Long `timeout:` CAPS are a documented smell but are NOT
# gated here: a cap is context-dependent (genuine file-upload / download /
# new-tab waits legitimately need several seconds), so a blanket numeric gate
# is too noisy to be useful. The hard, unambiguous signal is the fixed sleep.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

hits="$(grep -rnE 'waitForTimeout\(' --include='*.ts' e2e || true)"

if [[ -n "$hits" ]]; then
  echo "$hits"
  echo "→ Drop the fixed sleep; wait on the actual condition (waitForResponse / waitForSelector / waitForFunction) with a short cap."
  exit 1
fi
exit 0
