# Special-case issue handling & URL parsing

## Already-implemented issues

If you investigate and discover the feature/fix is already in the codebase:
- `cli.ts move-item --item <id> --column Done`
- Do NOT close via `gh issue close` — the project column is source of truth.

## No-code-change issues

If resolvable without code (config note, doc clarification, confirming existing
behavior):
- Move to Done directly.
- Don't create a branch or PR.

## Parsing a GitHub Project issue URL

GitHub Project issue URLs look like:
`https://github.com/users/<user>/projects/1/views/1?pane=issue&itemId=<itemId>&issue=<owner>%7C<repo>%7C<issue_number>`

The `issue` query param URL-decodes to `owner|repo|issue_number`. The issue number
is the last `|`-separated segment.
