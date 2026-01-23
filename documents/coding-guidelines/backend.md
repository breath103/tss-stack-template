# Backend Coding Guidelines

---

## Declare env vars in env.d.ts

Never use `process.env.FOO!`. Declare variables in `src/env.d.ts`.

```typescript
// ✅ Correct - declare in env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    MY_VAR: string;
    OPTIONAL_VAR?: string;
  }
}

// Then use without assertion
const value = process.env.MY_VAR;
```

```typescript
// ❌ Wrong
const value = process.env.MY_VAR!;
```

---

## Verify library config options by checking types

Never guess option placement. Check `.d.ts` files or use "Go to Definition".

```typescript
// ✅ Correct - verified in types
export const auth = betterAuth({
  advanced: {
    trustedProxyHeaders: true,
  },
});
```

```typescript
// ❌ Wrong - guessed placement
export const auth = betterAuth({
  trustedProxyHeaders: true,  // Not a top-level option
});
```

---

## Use loadConfig() for configuration (scripts only)

In scripts (e.g., `scripts/dev.ts`, `scripts/deploy.ts`, `scripts/build.ts`), use `loadConfig()` to read `tss.json`:

```typescript
import { loadConfig } from "shared/config";
const config = loadConfig();
```

This does NOT apply to runtime code (`src/`) which runs in Lambda and may not have access to `tss.json`.

---

## Use typed error classes when available

When catching errors, use `instanceof` with typed error classes instead of duck typing `error.name` or `error.code`.

```typescript
// ✅ Correct - use typed error class
import { ParameterNotFound } from "@aws-sdk/client-ssm";

try {
  await client.send(new GetParameterCommand({ Name: path }));
} catch (error) {
  if (error instanceof ParameterNotFound) {
    console.log("Parameter not found");
  } else {
    throw error;
  }
}
```

```typescript
// ❌ Wrong - duck typing error.name
try {
  await client.send(new GetParameterCommand({ Name: path }));
} catch (error) {
  if (error instanceof Error && error.name === "ParameterNotFound") {
    console.log("Parameter not found");
  }
}
```

---

## Run ESLint with --fix

```bash
npm run lint -- --fix
```
