import type { ComponentProps, FormEvent, ReactNode } from "react";

import { Button } from "./Button";
import { ModalBody, ModalHeader, ModalShell } from "./Modal";

// A small modal wrapping a submit form: header, the `children` fields, an
// optional root-error banner, and a cancel/submit footer. Callers wire
// `onSubmit` to their react-hook-form `handleSubmit(...)`. `submitDisabled`
// gates the submit button for non-RHF callers that validate as they type.
export function ModalForm({
  title,
  onClose,
  onSubmit,
  presentation = "small",
  rootError,
  cancelLabel,
  submitLabel,
  isSubmitting,
  submitDisabled,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  presentation?: ComponentProps<typeof ModalShell>["presentation"];
  rootError?: string;
  cancelLabel: string;
  submitLabel: string;
  isSubmitting: boolean;
  submitDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <ModalShell onClose={onClose} presentation={presentation}>
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          {children}
          {rootError && (
            <div role="alert" className="rounded-sm border border-error bg-error/5 px-3 py-2 text-base text-error">
              {rootError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="m" type="button" variant="normal" text={cancelLabel} onClick={onClose} />
            <Button
              size="m"
              type="submit"
              variant="accent1"
              text={submitLabel}
              loading={isSubmitting}
              disabled={submitDisabled}
            />
          </div>
        </form>
      </ModalBody>
    </ModalShell>
  );
}
