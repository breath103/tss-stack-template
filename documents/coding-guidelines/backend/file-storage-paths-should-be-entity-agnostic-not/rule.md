# File-storage paths should be entity-agnostic, not kind-segmented

Paths like `media/<user>/<memory>/audio/<uuid>.mp3` look neat until the same memory needs an image attachment, a transcript, a thumbnail — now deletion has to enumerate every kind, and the repo grows a switch per file type. Use `users/<user>/memories/<memory>/<uuid>.<ext>` and let the memory's metadata carry which key is which. Deletion becomes a single `ListObjectsV2` + `DeleteObjects` over the prefix.

Same rule for the repository: don't write `deleteAudioObject`, `audioKeyOf`, `deleteImageObject`. The repo deletes *files under a memory*; the kind-specific knowledge lives in the schema and the frontend.

```ts
// ✅ Correct — repo sweeps the whole memory prefix, kind-agnostic.
async function deleteMemoryFiles(userId: string, memoryId: string) {
  const Prefix = `users/${userId}/memories/${memoryId}/`;
  // list + bulk-delete, paginated
}
```

```ts
// ❌ Wrong — audio-specific helpers that multiply when we add image/video/transcript.
function audioKeyOf(m: MemoryMetadata): string | null { ... }
async function deleteAudioObject(key: string) { ... }
```
