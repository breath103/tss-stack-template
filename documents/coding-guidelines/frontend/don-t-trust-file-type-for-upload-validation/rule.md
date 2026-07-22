# Don't trust `File.type` for upload validation — sniff the actual bytes

The browser's `File.type` is derived from the file extension / OS metadata. Renaming `evil.html → pretend.mp3` gives you a File whose `type === "audio/mpeg"` even though the bytes are HTML. Using that value to gate an upload is a rubber-stamp, not a check.

Pass the file through a byte-level sniff (e.g. `fileTypeFromBlob` from the `file-type` package) before you call the presigned-URL endpoint. Reject anything whose sniffed MIME isn't in the allow-list — *then* send the sniffed MIME as the `contentType` body param. The backend zod enum rejects anything that sneaks past, but the frontend catches it earlier so the user sees a useful error instead of a generic 422.

```tsx
// ✅ Correct — sniff magic bytes, reject before presigning
import { fileTypeFromBlob } from "file-type";

const upload = useMutation(async (file: File) => {
  const sniffed = await fileTypeFromBlob(file);
  if (!sniffed || !isAudioMime(sniffed.mime)) {
    throw new Error(`Unsupported audio format${sniffed ? ` (${sniffed.mime})` : ""}.`);
  }
  const { url, key } = await api.fetch("/api/memories/:id/file-upload-url", "POST", {
    params: { id: memory.id },
    body: { type: "audio", contentType: sniffed.mime },
  });
  // …PUT, PATCH…
});
```

```tsx
// ❌ Wrong — File.type is spoofable; a renamed .html passes this check.
body: { type: "audio", contentType: file.type || "audio/mpeg" },
```

Also: `accept="audio/*"` on the `<input type="file">` is UX guidance, not security. Pair it with the bytes sniff.
