# Dev Process Test Plan

## Summary

Automated test script for `scripts/dev.ts` that verifies zero orphan processes under all kill scenarios, env flag propagation, and service readiness. Run this after any change to dev.ts, dev-process.ts, or package dev scripts.

## Test Script

Save as `/tmp/test-dev-orphans.sh` or run inline. Requires Python 3 (for `os.setsid()` on macOS which lacks `setsid`).

```bash
#!/bin/bash

cleanup() {
  lsof -ti:3000,3001,3002 2>/dev/null | xargs kill -9 2>/dev/null || true
  sleep 1
}

# Use python to start in new session (macOS has no setsid).
# This isolates dev.ts's process group from the test shell,
# so process.kill(0, "SIGTERM") in shutdown doesn't kill the test.
start_dev() {
  local extra_args="${1:-}"
  python3 -c "
import os, subprocess, sys
os.setsid()
p = subprocess.Popen(['./scripts/dev.ts'] + '$extra_args'.split(), stdout=open('/tmp/dev-test.log','w'), stderr=subprocess.STDOUT)
open('/tmp/dev-pid','w').write(str(p.pid))
p.wait()
" &
  sleep 1
}

wait_ready() {
  for i in $(seq 1 20); do
    if grep -q "All services ready" /tmp/dev-test.log 2>/dev/null; then
      echo "  Ready after ${i}s"
      return 0
    fi
    sleep 1
  done
  echo "  FAIL: Never became ready"
  cat /tmp/dev-test.log
  cleanup
  return 1
}

check_orphans() {
  local label=$1
  sleep 3
  P3000=$(lsof -ti:3000 2>/dev/null || true)
  P3001=$(lsof -ti:3001 2>/dev/null || true)
  P3002=$(lsof -ti:3002 2>/dev/null || true)

  if [ -z "$P3000" ] && [ -z "$P3001" ] && [ -z "$P3002" ]; then
    echo "  PASS: $label — no orphans"
    return 0
  else
    echo "  FAIL: $label — ORPHANS: 3000=${P3000:-clean} 3001=${P3001:-clean} 3002=${P3002:-clean}"
    cleanup
    return 1
  fi
}

test_signal() {
  local SIG=$1
  echo "=== TEST: $SIG ==="
  > /tmp/dev-test.log
  start_dev
  wait_ready || return 1
  DEV_PID=$(cat /tmp/dev-pid)
  echo "  dev:main PID=$DEV_PID"
  echo "  Sending $SIG"
  kill -$SIG $DEV_PID 2>/dev/null
  check_orphans "$SIG"
}

test_kill9() {
  echo "=== TEST: SIGKILL (kill -9, untrappable) ==="
  > /tmp/dev-test.log
  start_dev
  wait_ready || return 1
  DEV_PID=$(cat /tmp/dev-pid)
  echo "  dev:main PID=$DEV_PID"
  echo "  Sending SIGKILL"
  kill -9 $DEV_PID 2>/dev/null
  # Watchdog polls every 500ms — give it time
  sleep 4
  check_orphans "SIGKILL"
}

test_env_flag() {
  echo "=== TEST: --env flag propagation ==="
  > /tmp/dev-test.log
  start_dev "--env=test"
  sleep 5
  DEV_PID=$(cat /tmp/dev-pid)

  BACKEND_ENV=$(grep "\[Backend\].*Loaded environment" /tmp/dev-test.log || true)
  FRONTEND_ENV=$(grep "\[Frontend\].*Loaded environment" /tmp/dev-test.log || true)

  PASS=true
  if echo "$BACKEND_ENV" | grep -q ".env.test"; then
    echo "  PASS: Backend loads .env.test"
  else
    echo "  FAIL: Backend env: $BACKEND_ENV"
    PASS=false
  fi
  if echo "$FRONTEND_ENV" | grep -q ".env.test"; then
    echo "  PASS: Frontend loads .env.test"
  else
    echo "  FAIL: Frontend env: $FRONTEND_ENV"
    PASS=false
  fi

  kill -TERM $DEV_PID 2>/dev/null
  sleep 3
  cleanup
  $PASS
}

# --- Run ---
cleanup
FAILED=0

test_signal TERM  || FAILED=1
echo ""
test_signal INT   || FAILED=1
echo ""
test_kill9        || FAILED=1
echo ""
test_env_flag     || FAILED=1

echo ""
if [ $FAILED -eq 0 ]; then
  echo "=== ALL TESTS PASSED ==="
else
  echo "=== SOME TESTS FAILED ==="
  exit 1
fi
```

## What Each Test Covers

| Test | What it checks | Mechanism |
|------|---------------|-----------|
| SIGTERM | Normal `kill PID` | `shutdown()` → `process.kill(0, "SIGTERM")` |
| SIGINT | Ctrl+C | Same as SIGTERM (signal handler) |
| SIGKILL | `kill -9 PID` (untrappable) | Watchdog process detects dev.ts PID gone, kills group |
| --env flag | `--env=test` propagated to children | Both backend and frontend log "Loaded environment from .env.test" |

## Subcommands

`./scripts/dev.ts` exposes four entrypoints sharing a single `.dev-status.json` (gitignored):

| Subcommand | Purpose |
|------------|---------|
| `(no args)` | Foreground — streams logs, Ctrl-C to stop |
| `start` | Spawns detached foreground, polls `.dev-status.json` until `ready` (30s timeout) |
| `status` | Reads `.dev-status.json`, prints aggregate + per-process readiness |
| `stop` | Terminates the tree referenced by `.dev-status.json` |

## Architecture: How Orphan Prevention Works

```
Terminal / Shell                                detached sessions (own pgroup)
  └─ dev.ts (foreground = pgroup leader)         ├─ sh watchdog (polls dev.ts PID)
       ├─ backend/scripts/dev.ts                 └─ sh SIGKILL escalator (spawned on shutdown)
       │    └─ npx tsx scripts/server.ts
       ├─ frontend/scripts/dev.ts
       │    └─ npx vite
       ├─ edge/scripts/dev.ts
       └─ backend/scripts/dev-types.ts
            └─ npx tsc --watch
```

The four `DevProcess` children share `dev.ts`'s process group (no `detached: true`), so `process.kill(0, "SIGTERM")` kills the whole tree. **All four — including `types` — register `onCrash: shutdown`**, so any subprocess death (not just critical ones) tears the whole stack down.

The watchdog and the SIGKILL escalator are spawned **detached** so they live in their own sessions. That matters because the pgroup SIGTERM would otherwise take them down before they can escalate to SIGKILL.

**Three kill paths:**

1. **Graceful (SIGINT/SIGTERM/SIGHUP/SIGTSTP)**: dev.ts traps signal → `shutdown()` → walks `ps` tree, SIGTERMs each descendant + pgroup, spawns detached SIGKILL escalator (2s grace), `process.exit(1)`.
2. **Subprocess crash**: any `DevProcess` exit → `onCrash: shutdown` → same path as (1).
3. **Parent SIGKILL (untrappable)** or terminal death: detached `sh` watchdog detects `kill -0 dev_pid` fails → SIGTERMs the pgroup → sleeps 2s → SIGKILLs the pgroup. Survives the SIGTERM because it's in its own session.
4. **External `stop`**: `./scripts/dev.ts stop` reads `.dev-status.json`, liveness-checks the recorded pid (avoids signalling a recycled PID), runs the same SIGTERM + escapee + SIGKILL-escalation sequence.

The escalator uses `kill -9 <pid1> <pid2> ... -<pgid>` in a detached `sh`, so processes that ignore SIGTERM (e.g. a tool that traps it) still get reaped within `GRACE_MS` (2s).

## When to Run

- Any change to `scripts/dev.ts`
- Any change to `scripts/dev/dev-process.ts`
- Any change to package dev scripts (`packages/*/scripts/dev.ts`)
- Any change to shebang patterns

## Test script staleness note

The bash script above predates the `start`/`status`/`stop` subcommands and the readiness banner change (`✓ Dev server ready at <url>` instead of `All services ready`). The orphan-prevention guarantees it tests still hold, but the script itself needs a refresh — patch `wait_ready` to grep for the new banner (or, better, poll `./scripts/dev.ts status`) and replace `kill -TERM $DEV_PID` with `./scripts/dev.ts stop` for the SIGTERM path.
