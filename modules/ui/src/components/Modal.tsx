import { X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { type ReactNode } from "react";
import { useI18n } from "../i18n/I18nContext";
import { cn } from "../lib/utils";
import { Button } from "./Button";
import dict from "./Modal.i18n.json";
import { useEscapeClose, useInertBackground } from "./modal-runtime";

const PRESENTATION_SIZES = {
  small: "max-w-md",
  narrow: "max-w-2xl",
  medium: "max-w-4xl",
  large: "max-w-6xl",
} as const;

export function ModalShell({
  onClose,
  presentation = "medium",
  children,
}: {
  onClose: () => void;
  presentation?: "small" | "narrow" | "medium" | "large";
  children: ReactNode;
}) {
  useEscapeClose(onClose);
  useInertBackground();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // Enter 200ms ease-out / exit 150ms ease-in (guideline: exit shorter than enter).
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-full w-full flex-col overflow-hidden rounded-lg border bg-surface-1 shadow-xl",
          PRESENTATION_SIZES[presentation]
        )}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" } }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  const i18n = useI18n(dict);

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h3 className="font-medium">{title}</h3>
      <Button size="m" variant="ghost" icon={X} onClick={onClose} aria-label={i18n.close} />
    </div>
  );
}

export function ModalBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>;
}
