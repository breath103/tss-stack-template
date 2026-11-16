# Date every legacy-format shim with an expiring TODO

Same rule as the frontend version
(`frontend/date-every-legacy-format-shim-with-an-expiring-todo/rule.md`). Code
that accepts an old, non-persistent format carries
`// TODO: [yyyy/mm/dd] delete this code`. Examples are a retired request body
shape, an old query param or a renamed MCP tool argument. On that date,
`local/expired-todo` fails lint and forces the deletion.

Persisted data is migrated (migration or `migrate-*.ts` script), never shimmed.
