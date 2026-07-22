# Long classnames → extract a component, or move to a module.css with `@apply`

If you feel the urge to lift a 10+-utility Tailwind className into a top-of-file `const ITEM = "flex w-full items-center …"`, that's the smell. The string is long because it's painting a *thing* — and that thing wants either a real component or its own CSS module.

Pick one:

1. **Extract a component.** When the styled element is reused 2+ times in the same file and carries semantics (a menu item, a chip, a row header), make it a small JSX component. The element type, ARIA, and event handlers live with the styles.

   ```tsx
   // ❌ Wrong — string-named utility const repeated across siblings
   const ITEM = "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-surface-2-highlight-1 active:scale-[0.98]";
   <>
     <button className={ITEM} onClick={onPick}>…</button>
     <button className={ITEM} onClick={onLink}>…</button>
   </>

   // ✅ Correct — a real MenuItem component owns the styles + the contract
   function MenuItem({ icon, label, onClick }: {…}) {
     return (
       <button
         type="button"
         onClick={onClick}
         className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-surface-2-highlight-1 active:scale-[0.98]">
         {icon}{label}
       </button>
     );
   }
   ```

2. **Move it to a colocated `.module.css` with `@apply`.** When the long string is a one-off (a hero card, a sticky shell) and a JSX component would just be styling with no contract, that's what CSS modules are for. Reference Tailwind via `@reference "@/global.css"` (see `frontend/reference-tailwind-in-css-modules-with-reference-global`).

   ```css
   /* PaymentCard.module.css */
   @reference "@/global.css";
   .card {
     @apply rounded-md border bg-surface-2 p-4 shadow-[0_8px_24px_-12px_oklch(0_0_0/0.2)];
     /* … */
   }
   ```

   ```tsx
   import css from "./PaymentCard.module.css";
   <div className={css.card}>…</div>
   ```

## What's NOT a violation

- A short inline className stays inline. The smell is **lifting** a long string to a named constant just to keep the JSX line short.
- A `cn(...)` call composing 4–6 conditional utilities inline is fine — that's runtime variant logic, not a smell.
- A single one-off long className inline at one callsite is fine. The smell appears when you reach for `const ITEM = "…"`.

The trigger is "I had to extract this string because it was too long to repeat." Both fixes — component or module.css — relocate the styles into a place that owns them; a string constant doesn't.
