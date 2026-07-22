import { Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@ui/components/Button";
import { cn } from "@ui/lib/utils";
import { type ReactNode, useEffect, useState } from "react";
import { AccentsDemo } from "./AccentsDemo";
import { ButtonsDemo } from "./ButtonsDemo";
import { CheckboxDemo } from "./CheckboxDemo";
import { ChipsDemo } from "./ChipsDemo";
import { ContextMenuDemo } from "./ContextMenuDemo";
import { DateFormatterDemo } from "./DateFormatterDemo";
import { DatePickersDemo } from "./DatePickersDemo";
import { DialogsDemo } from "./DialogsDemo";
import { IconsDemo } from "./IconsDemo";
import { InputsDemo } from "./InputsDemo";
import { ResizableDrawerDemo } from "./ResizableDrawerDemo";
import { SectionTitle } from "./SectionTitle";
import { SegmentedToggleDemo } from "./SegmentedToggleDemo";
import { SelectorDemo } from "./SelectorDemo";
import { StateDemo } from "./StateDemo";
import { SurfacesDemo } from "./SurfacesDemo";
import { TrackerDemo } from "./TrackerDemo";
import { TypographyDemo } from "./TypographyDemo";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const SECTIONS = [
  { title: "Surfaces", content: <SurfacesDemo /> },
  { title: "Accents", content: <AccentsDemo /> },
  { title: "Typography", content: <TypographyDemo /> },
  { title: "Tracker labels", content: <TrackerDemo /> },
  { title: "Button", content: <ButtonsDemo /> },
  { title: "Icons", content: <IconsDemo /> },
  { title: "Dialogs", content: <DialogsDemo /> },
  { title: "Resizable drawer", content: <ResizableDrawerDemo /> },
  { title: "Form Inputs", content: <InputsDemo /> },
  { title: "Selector", content: <SelectorDemo /> },
  { title: "Context menu", content: <ContextMenuDemo /> },
  { title: "Date pickers", content: <DatePickersDemo /> },
  { title: "Date formatter", content: <DateFormatterDemo /> },
  { title: "Checkbox", content: <CheckboxDemo /> },
  { title: "Segmented toggle", content: <SegmentedToggleDemo /> },
  { title: "Tags & Chips", content: <ChipsDemo /> },
  { title: "State Colors", content: <StateDemo /> },
].map(s => ({ ...s, id: slugify(s.title) }));

export function DesignPage() {
  return (
    <div className="min-h-screen bg-background text-text-1">
      <PageHeader />
      <FloatingIndex />
      <div className="mx-auto max-w-6xl px-8 pb-24 lg:px-12">
        {SECTIONS.map(s => (
          <Section key={s.id} id={s.id} title={s.title}>
            {s.content}
          </Section>
        ))}
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-baseline gap-3 px-8 py-4 lg:px-12">
        <span className="text-display text-lg">TSS</span>
        <SectionTitle>Design system</SectionTitle>
        <div className="ml-auto self-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <Button
      size="s"
      variant="ghost"
      icon={dark ? Sun : Moon}
      text={dark ? "Light" : "Dark"}
      onClick={() => setDark(d => !d)}
    />
  );
}

function FloatingIndex() {
  const [active, setActive] = useState(SECTIONS[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="fixed top-1/2 left-4 z-20 hidden -translate-y-1/2 xl:block">
      <ul className="flex flex-col gap-1 border-l pl-3">
        {SECTIONS.map(s => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                "block py-0.5 text-sm transition-colors duration-150 hover:text-text-1",
                s.id === active ? "font-medium text-text-1" : "text-text-3"
              )}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t py-12 first:border-t-0">
      <SectionTitle className="mb-8">{title}</SectionTitle>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
