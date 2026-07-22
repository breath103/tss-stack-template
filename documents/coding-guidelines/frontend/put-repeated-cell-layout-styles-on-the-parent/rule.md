# Put repeated cell/layout styles on the parent or primitive

When rendering repeated structural UI (table cells, grid cells, timeline cells, headers), avoid copying the same `className` or `style` onto every child. Put shared behavior in the reusable primitive, and put repeated sizing/layout math on the parent container when CSS can express it once.

This especially applies to mapped children: if each child receives the same width, border direction, alignment, padding, or typography, the component shape is wrong. The row/grid parent should own repeated sizing (`gridTemplateColumns`, CSS grid classes), and the cell primitive should own repeated cell chrome (`border-r`, alignment, text style). Per-child props should represent real data differences only.

```tsx
// ❌ Wrong — width and border policy repeated for every cell.
function DayRow({ days }: { days: DayGroup[] }) {
  return (
    <div className="flex h-1/2 items-stretch">
      {days.map((day, i) => (
        <AstraTableHeadCell
          key={day.key}
          border={i === 0 ? "none" : "left"}
          className="relative shrink-0 justify-between px-1.5"
          style={{ width: PX_PER_DAY }}
        >
          {day.label}
        </AstraTableHeadCell>
      ))}
    </div>
  );
}
```

```tsx
// ✅ Correct — parent owns repeated sizing; primitive owns cell chrome.
function DayRow({ days }: { days: DayGroup[] }) {
  return (
    <div className="grid h-1/2" style={{ gridTemplateColumns: `repeat(${days.length}, ${PX_PER_DAY}px)` }}>
      {days.map((day) => (
        <AstraTableHeadCell key={day.key} className="relative justify-between px-1.5">
          {day.label}
        </AstraTableHeadCell>
      ))}
    </div>
  );
}
```
