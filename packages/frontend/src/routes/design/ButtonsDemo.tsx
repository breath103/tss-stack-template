import { Check } from "@phosphor-icons/react";
import { Button } from "@ui/components/Button";
import { useState } from "react";

const VARIANTS = ["normal", "accent1", "accent2", "accent3", "ghost", "destructive"] as const;
const SIZES = ["s", "m", "l"] as const;
const CONTENTS = ["text", "icon", "icon-text"] as const;

function useToggle() {
  const [on, setOn] = useState(false);
  return { on, toggle: () => setOn(v => !v) };
}

function TextCell({
  variant,
  size,
  text,
}: {
  variant: (typeof VARIANTS)[number];
  size: (typeof SIZES)[number];
  text: string;
}) {
  const t = useToggle();
  return <Button variant={variant} size={size} text={text} loading={t.on} onClick={t.toggle} />;
}

function IconCell({ variant, size }: { variant: (typeof VARIANTS)[number]; size: (typeof SIZES)[number] }) {
  const t = useToggle();
  return <Button variant={variant} size={size} icon={Check} loading={t.on} onClick={t.toggle} />;
}

function IconTextCell({
  variant,
  size,
  text,
}: {
  variant: (typeof VARIANTS)[number];
  size: (typeof SIZES)[number];
  text: string;
}) {
  const t = useToggle();
  return <Button variant={variant} size={size} icon={Check} text={text} loading={t.on} onClick={t.toggle} />;
}

export function ButtonsDemo() {
  return (
    <table className="text-sm">
      <thead className="text-text-3">
        <tr>
          <th />
          {CONTENTS.flatMap(c =>
            SIZES.map(s => (
              <th key={`${c}-${s}`} className="px-3 pb-2 text-left font-medium">
                {c}/{s}
              </th>
            ))
          )}
        </tr>
      </thead>
      <tbody>
        {VARIANTS.map(v => (
          <tr key={v}>
            <td className="pr-6 text-text-3">{v}</td>
            {CONTENTS.flatMap(c =>
              SIZES.map(s => {
                const label = v === "destructive" ? "Delete" : "Engage";
                return (
                  <td key={`${c}-${s}`} className="px-3 py-2">
                    {c === "text" && <TextCell variant={v} size={s} text={label} />}
                    {c === "icon" && <IconCell variant={v} size={s} />}
                    {c === "icon-text" && <IconTextCell variant={v} size={s} text={label} />}
                  </td>
                );
              })
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
