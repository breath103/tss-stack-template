---
topic: Untrusted input
order: 20
---

# When you validate an uploaded file, sniff its bytes for the MIME type; don't trust File.type or accept=.

The browser derives `File.type` from the file extension and OS metadata. Renaming
`evil.html → pretend.mp3` gives a `File` whose `type === "audio/mpeg"` although the bytes are
HTML. Gating an upload on that value checks nothing.

When an upload is restricted to certain kinds of file, sniff the bytes (for example
`fileTypeFromBlob` from the `file-type` package, which has to be installed first) before asking
for the upload URL. Reject anything whose sniffed MIME is not on the allow-list, then send the
**sniffed** MIME as the content type. The backend's zod enum rejects whatever slips past; the
frontend check gives the user a useful error instead of a generic 400.

```tsx
// ✅ Correct — sniff, reject, then send the sniffed type
const sniffed = await fileTypeFromBlob(file);
if (!sniffed || !ALLOWED_MIME.has(sniffed.mime)) throw new UnsupportedFileError(sniffed?.mime ?? null);
await requestUploadUrl({ contentType: sniffed.mime });
```

```tsx
// ❌ Wrong — a renamed .html passes
await requestUploadUrl({ contentType: file.type || "audio/mpeg" });
```

`accept="audio/*"` on a file input is UX guidance, not validation.
