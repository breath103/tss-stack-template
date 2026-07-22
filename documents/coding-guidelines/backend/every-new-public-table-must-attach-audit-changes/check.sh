#!/usr/bin/env bash
# Rule: every migration that creates a public table must attach the
# audit_changes trigger to that table in the same file.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

# Legacy migrations whose tables were attached by the audit_log DO loop on
# production. Filename timestamp is NOT a reliable proxy — `tasks_views` has
# an older filename (20260614) but landed AFTER audit_log was already on prod,
# so its trigger was never attached. The list below is the verified set.
LEGACY_FILES=(
  20260525130000_users_orgs.sql
  20260525140000_files.sql
  20260526120000_projects_works_tasks.sql
  20260526150000_work_state.sql
  20260526180000_task_history.sql
  20260601120000_comments.sql
  20260603120000_task_relations.sql
  20260615120000_comment_mentions.sql
  20260617120000_audit_log.sql
  # Retrofitted by 20260715120000_audit_log_backfill_missing_triggers.sql —
  # these landed after audit_log without the inline trigger; the backfill
  # migration attaches them on production. New migrations must NOT rely on
  # this escape hatch; attach the trigger in the same file as CREATE TABLE.
  20260614140217_tasks_views.sql
  20260618120000_objectives.sql
  20260623120000_task_related_users.sql
)

is_legacy() {
  local name="$1"
  for x in "${LEGACY_FILES[@]}"; do [[ "$name" == "$x" ]] && return 0; done
  return 1
}

fail=0
for f in packages/backend/supabase/migrations/*.sql; do
  is_legacy "$(basename "$f")" && continue

  # Extract every table name created in this file. Matches:
  #   CREATE TABLE foo (
  #   CREATE TABLE public.foo (
  #   CREATE TABLE IF NOT EXISTS foo (
  tables=$(grep -iEo 'CREATE TABLE (IF NOT EXISTS )?(public\.)?[a-z_][a-z0-9_]*' "$f" \
           | awk '{print $NF}' \
           | sed 's/^public\.//' \
           | sort -u || true)

  for t in $tables; do
    if ! grep -qE "CREATE TRIGGER audit_changes[[:space:]]+AFTER INSERT OR UPDATE OR DELETE ON public\.${t}\b" "$f"; then
      echo "$f: CREATE TABLE $t — missing 'CREATE TRIGGER audit_changes ... ON public.$t' in same file"
      fail=1
    fi
  done
done

if [[ $fail -ne 0 ]]; then
  echo "→ Every new public table must attach the audit_changes trigger in the same migration."
  echo "  See documents/coding-guidelines/backend/every-new-public-table-must-attach-audit-changes/rule.md"
  exit 1
fi
exit 0
