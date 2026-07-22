# Use typed error classes when available

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
