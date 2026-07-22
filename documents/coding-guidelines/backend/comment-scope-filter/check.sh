#!/usr/bin/env bash
# Every route that emits Comment rows must filter through the scope helper.
# A route file passes iff it either:
#   - calls `filterVisibleComments(` or `isCommentVisibleTo(`, OR
#   - opts out with a `// scope: <reason>` line, OR
#   - doesn't deal with comment rows at all (the regex below misses it).
set -euo pipefail

cd "$(dirname "$0")/../../../.."

routes_dir="packages/backend/src/routes"
fail=0

# Files that mention the Comment row type or return a `comments` key are the
# candidates. The grep is intentionally loose — false positives are easy to
# clear with a scope: opt-out comment; missed coverage is the harm we care
# about.
candidates=$(grep -lE 'commentsRepository\.|commentInboxService\.|commentMentionsRepository\.listByTask' "$routes_dir"/*.ts 2>/dev/null || true)

for f in $candidates; do
  if grep -qE 'isCommentVisibleTo\(|//[[:space:]]*scope:' "$f"; then
    continue
  fi
  echo "::error file=$f::comment-returning route is missing filterVisibleComments / isCommentVisibleTo (or a // scope: opt-out comment)"
  fail=1
done

exit $fail
