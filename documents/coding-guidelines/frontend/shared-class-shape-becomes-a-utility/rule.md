---
topic: CSS and classNames
order: 30
---

# When one class shape with no variants repeats at 3+ sites across unrelated features, make it an @utility (theme.css for the design system, global.css for the app).

A repeated class string becomes an `@utility` only when it is one shape that unrelated features
share; it never becomes a JS constant (`frontend/where-class-strings-live`).

| Situation | Home |
|---|---|
| One shape with no variants, at 3+ sites across unrelated features | An `@utility` (`theme.css` in `modules/ui` for the design system, `global.css` for the app). |
| Repeated only inside one feature | A small component in that feature, or leave the repetition. Never a global utility. |

An `@utility` gives one class name per call site, one place to tune its states, and takes part
in Tailwind's ordering and conflict resolution. It is for **one shared shape**. The moment the
thing has variant, size or color axes it is a component with a `.module.css`
(`frontend/variant-or-repeated-component-classes-go-in-module-css`); one `@utility` per
variant value bloats the global stylesheet. A shape only one feature uses is not design-system
material, so promoting it is over-promotion, not dedup.
