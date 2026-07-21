import { type Control, Controller, type FieldPath, type FieldValues, type RegisterOptions } from "react-hook-form";

import { Input } from "./Input";
import { LabeledField } from "./LabeledField";
import { Selector } from "./Selector";

// Labeled react-hook-form text input — the field row shared by the admin org
// and user add/edit forms.
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  rules,
  type,
  disabled,
  required,
  placeholder,
  autoFocus,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  rules?: RegisterOptions<T, FieldPath<T>>;
  type?: "text" | "email";
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <LabeledField label={label}>
      <Controller
        control={control}
        name={name}
        rules={rules}
        render={({ field }) => (
          <Input
            name={field.name}
            type={type}
            value={
              // oxlint-disable-next-line typescript/no-unnecessary-condition -- field.value types as non-null here, but react-hook-form passes undefined before the field registers; the ?? keeps the input from rendering "undefined"
              String(field.value ?? "")
            }
            onChange={field.onChange}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            onMount={autoFocus ? el => el.focus() : undefined}
          />
        )}
      />
    </LabeledField>
  );
}

// Labeled RHF nullable Selector over `{ id, name }` options — the empty choice
// (`null`) reads as `noneLabel` (org's parent, user's org). The Selector holds
// `null` natively, so no sentinel is needed.
export function NullableSelectField<T extends FieldValues>({
  control,
  name,
  label,
  noneLabel,
  options,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  noneLabel: string;
  options: { id: string; name: string }[];
}) {
  return (
    <LabeledField label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Selector
            value={(field.value as string | null) ?? null}
            onChange={field.onChange}
            options={[null, ...options.map(o => o.id)]}
            label={v => ({
              text: v === null ? noneLabel : (options.find(o => o.id === v)?.name ?? ""),
            })}
            placeholder={noneLabel}
          />
        )}
      />
    </LabeledField>
  );
}
