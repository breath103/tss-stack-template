import { useRef } from "react";

import { useOnChange } from "../hooks/useOnChange";
import { cn } from "../lib/utils";

interface BaseProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Fired when the field receives focus. */
  onFocus?: () => void;
  /** Fired when the field is clicked. */
  onClick?: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onMount?: (el: HTMLInputElement | HTMLTextAreaElement) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  /**
   * Strip own border, background, and focus ring so the field can live inside
   * a styled wrapper that owns those visuals (e.g. a composer box that also
   * contains attachment chips). The wrapper must handle the focus ring itself.
   */
  chromeless?: boolean;
}

interface AutoresizeProps extends BaseProps {
  autoresize: true;
  multiline?: never;
  rows?: never;
  minLine?: number;
  maxLine?: number;
}

const BASE_INPUT_CLASS =
  "w-full rounded-md border bg-input text-text-1 transition-colors placeholder:text-text-3 focus-input disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-error/20";

// When `chromeless` is set, omit the border/bg/ring so the field sits inside
// a wrapper that owns those visuals.
const CHROMELESS_CLASS =
  "w-full bg-transparent text-text-1 outline-none placeholder:text-text-3 disabled:cursor-not-allowed disabled:opacity-50";

export function Input(
  props: BaseProps &
    (
      | {
          autoresize?: false;
          multiline?: false;
          rows?: never;
          minLine?: never;
          maxLine?: never;
          type?: "text" | "email" | "password" | "url" | "tel" | "search" | "number" | "date" | "datetime-local";
          /**
           * Native `size` attribute — character-count hint browsers use as the input's
           * intrinsic min-width. Set `size={1}` when the input sits in a CSS-grid auto
           * track so the column doesn't widen to the default ~150px.
           */
          size?: number;
        }
      /** Fixed-height multi-line textarea. No auto-resize. */
      | {
          multiline: true;
          autoresize?: false;
          rows?: number;
          minLine?: never;
          maxLine?: never;
        }
      | AutoresizeProps
    )
) {
  if (props.autoresize) {
    return <AutoresizeTextarea {...props} />;
  }
  if ("multiline" in props && props.multiline) {
    const { value, onChange, onMount, onFocus, onClick, rows, chromeless, className, ...rest } = props;
    return (
      <Textarea
        value={value}
        rows={rows}
        onChange={onChange}
        onFocus={onFocus}
        onClick={onClick}
        onMount={onMount}
        // A textarea is line-height-driven, not h-8: py-0.75 + 1px border puts one line on
        // 2rem, flush with a single-line Input and a Button size="m".
        className={cn(
          chromeless ? CHROMELESS_CLASS : BASE_INPUT_CLASS,
          "resize-none px-3 py-0.75 text-base",
          className
        )}
        rest={rest}
      />
    );
  }
  const { value, onChange, onMount, onFocus, onClick, chromeless, className, type = "text", ...rest } = props;
  return (
    <SingleLine
      value={value}
      type={type}
      onChange={onChange}
      onFocus={onFocus}
      onClick={onClick}
      onMount={onMount}
      className={cn(chromeless ? CHROMELESS_CLASS : BASE_INPUT_CLASS, "h-8 px-3 text-base", className)}
      rest={rest}
    />
  );
}

// Inner components own a stable ref + a one-shot useOnChange for `onMount`, so
// `onMount` fires exactly once when the element mounts — not on every render
// the way a fresh inline `ref={el => onMount(el)}` callback would.
function SingleLine({
  value,
  type,
  onChange,
  onFocus,
  onClick,
  onMount,
  className,
  rest,
}: {
  value: string;
  type: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onMount?: (el: HTMLInputElement) => void;
  className: string;
  rest: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useOnce(ref, onMount);
  return (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={e => onChange(e.currentTarget.value)}
      onFocus={onFocus}
      onClick={onClick}
      className={className}
      {...rest}
    />
  );
}

function Textarea({
  value,
  rows,
  onChange,
  onFocus,
  onClick,
  onMount,
  className,
  rest,
}: {
  value: string;
  rows?: number;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  onMount?: (el: HTMLTextAreaElement) => void;
  className: string;
  rest: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useOnce(ref, onMount);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      onChange={e => onChange(e.currentTarget.value)}
      onFocus={onFocus}
      onClick={onClick}
      className={className}
      {...rest}
    />
  );
}

function useOnce<T extends HTMLElement>(ref: React.RefObject<T | null>, onMount: ((el: T) => void) | undefined) {
  useOnChange(() => {
    if (ref.current && onMount) onMount(ref.current);
  }, []);
}

function AutoresizeTextarea({
  value,
  onChange,
  onMount,
  onFocus,
  onClick,
  minLine = 1,
  maxLine = 3,
  chromeless,
  className,
  autoresize: _autoresize, // oxlint-disable-line typescript/no-unused-vars
  ...rest
}: AutoresizeProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useOnce(ref, onMount);

  useOnChange(() => {
    const ta = ref.current;
    if (!ta) return;

    const styles = window.getComputedStyle(ta);
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2;
    const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const borderY = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);

    const minH = lineHeight * minLine + padY + borderY;
    const maxH = lineHeight * maxLine + padY + borderY;

    // Reset so scrollHeight reflects actual content, not the previous clamp.
    ta.style.height = "auto";
    // scrollHeight is content + padding; add border for border-box layout.
    const desired = ta.scrollHeight + borderY;
    const target = Math.min(Math.max(desired, minH), maxH);

    ta.style.height = `${target}px`;
    ta.style.overflowY = desired > maxH ? "auto" : "hidden";
  }, [value, minLine, maxLine]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.currentTarget.value)}
      onFocus={onFocus}
      onClick={onClick}
      rows={minLine}
      // A textarea is line-height-driven, not h-8: py-0.75 + 1px border puts one line on
      // 2rem, flush with a single-line Input and a Button size="m".
      className={cn(chromeless ? CHROMELESS_CLASS : BASE_INPUT_CLASS, "resize-none px-3 py-0.75 text-base", className)}
      {...rest}
    />
  );
}
