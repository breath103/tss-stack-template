import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "./Button";
import dict from "./ConfirmDialog.i18n.json";
import { ModalShell } from "./Modal";

export function ConfirmDialog({
  title,
  description,
  confirmText,
  cancelText,
  variant = "default",
  onClose,
  onConfirm,
  onSettled,
}: {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onClose: () => void;
  onConfirm?: () => void | Promise<unknown>;
  // Bridges back to the outer `confirm()` promise. `true` = succeeded,
  // Error = onConfirm threw. Either way the modal should close.
  onSettled: (result: boolean | Error) => void;
}) {
  const i18n = useI18n(dict);
  const [loading, setLoading] = useState(false);

  const fire = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onConfirm?.();
      onSettled(true);
    } catch (err) {
      onSettled(err instanceof Error ? err : new Error(String(err)));
    }
  }, [loading, onConfirm, onSettled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void fire();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fire]);

  return (
    <ModalShell onClose={loading ? () => undefined : onClose} presentation="small">
      <div className="p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mt-2 text-text-3">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          {cancelText !== "" && (
            <Button size="m" variant="normal" text={cancelText ?? i18n.cancel} onClick={onClose} disabled={loading} />
          )}
          <Button
            size="m"
            variant={variant === "destructive" ? "destructive" : "normal"}
            text={confirmText ?? i18n.confirm}
            onClick={() => void fire()}
            loading={loading}
          />
        </div>
      </div>
    </ModalShell>
  );
}
