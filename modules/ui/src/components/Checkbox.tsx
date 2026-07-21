import { Check, Minus } from "@phosphor-icons/react";
import { cn } from "../lib/utils";
import styles from "./Checkbox.module.css";

/**
 * Accessible checkbox with an "indeterminate" mixed state (e.g. "some rows
 * selected"). Under the hood it's a native <input type="checkbox"> — the
 * visual box is rendered alongside it and toggled via peer-*.
 */
export function Checkbox({
  checked,
  indeterminate,
  onChange,
  onClick,
  className,
  disabled,
  ...props
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onClick" | "type" | "checked">) {
  const Icon = (() => {
    if (indeterminate) return Minus;
    else if (checked) return Check;
    else return null;
  })();

  return (
    <label className={cn(styles.label, disabled && styles.labelDisabled, className)} onClick={onClick}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange?.(e.target.checked)}
        className={styles.input}
        {...props}
      />
      <span className={cn(styles.box)}>{Icon && <Icon className={styles.icon} />}</span>
    </label>
  );
}
