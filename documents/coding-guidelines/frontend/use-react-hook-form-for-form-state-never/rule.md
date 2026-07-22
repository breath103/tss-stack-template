# Use react-hook-form for form state — never hand-roll `useState` per field

Forms with multiple inputs go through `react-hook-form`. Don't chain `useState` per field, then a separate `useState` for submission/error state. `useForm` consolidates: typed values, dirty tracking, validation, async submission status, and field-level + form-level errors — all out of the box.

For form-level errors (e.g. "invalid email or password" from an auth endpoint), use `setError("root", { message })` and read via `formState.errors.root?.message`. Don't introduce a parallel `useState`.

```tsx
// ✅ Correct — useForm owns all form state
import { useForm } from "react-hook-form";

type Values = { email: string; password: string };

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const { error } = await signIn.email({ email, password });
    if (error) {
      setError("root", { message: error.message ?? "Invalid email or password." });
      return;
    }
    onSuccess();
  });

  return (
    <form onSubmit={(e) => { void onSubmit(e); }}>
      <Input {...register("email", { required: true })} type="email" />
      <Input {...register("password", { required: true })} type="password" />
      {formState.errors.root && (
        <div className="text-error">{formState.errors.root.message}</div>
      )}
      <Button type="submit" loading={formState.isSubmitting}>Log in</Button>
    </form>
  );
}
```

```tsx
// ❌ Wrong — three useState calls + manual loading flag
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState<string | null>(null);
const submit = useMutation(async () => { ... });
```

Single-input prototypes can stay `useState`; the rule kicks in once you have 2+ fields, or any combination of fields + validation + submission status. Use `useFieldArray` for repeating sections; `Controller` for non-native inputs that don't accept a ref through spread.
