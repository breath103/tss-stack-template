# Wrap in options object when more than 3 parameters

Functions with more than 3 parameters must use an options object.

```typescript
// ✅ Correct - options object
interface UploadOptions {
  accessToken: string;
  driveId: string;
  parentId: string;
  filename: string;
  bytes: Uint8Array;
  contentType: string;
}

async function uploadFile(opts: UploadOptions) {
  const { accessToken, driveId, parentId, filename, bytes, contentType } = opts;
}
```

```typescript
// ❌ Wrong - too many positional parameters
async function uploadFile(
  accessToken: string,
  driveId: string,
  parentId: string,
  filename: string,
  bytes: Uint8Array,
  contentType: string,
) {}
```
