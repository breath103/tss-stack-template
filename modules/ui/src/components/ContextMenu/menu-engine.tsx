import { CaretRight, Check } from "@phosphor-icons/react";
import * as PopperPrimitive from "@radix-ui/react-popper";
import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { useEvent } from "../../lib/use-event";
import { cn } from "../../lib/utils";
import { ButtonLabel } from "../ButtonLabel";
import styles from "../ContextMenu.module.css";
import { OptionRow } from "../options/OptionRow";
import { Tooltip } from "../Tooltip";
import {
  decorationOf,
  isDecoration,
  type MenuDecoration,
  type MenuItem,
  type RenderItem,
  type SubItems,
  VIEWPORT_MARGIN,
} from "./types";

const SUBMENU_GAP = 4; // horizontal offset from the parent row to its submenu

/** One highlighted level: the row list and the active index within it. */
type Level<A> = { list: ReadonlyArray<A | MenuDecoration>; index: number };

/** Everything renderLevel needs to draw a level and its submenus. */
type LevelContext<A> = {
  /** The host popover's open state — false keeps every submenu closed as it fades out. */
  open: boolean;
  levels: Array<Level<A>>;
  renderItem: RenderItem<A>;
  subItems: SubItems<A>;
  setActive: (path: number[]) => void;
  onPick: (action: A) => void;
  leaveMenu: (e: React.MouseEvent) => void;
};

/**
 * The menu engine — highlight path, keyboard nav, hover, submenus, commit.
 * Deliberately built over a bare Popper (no dismiss layer of its own) so the
 * single host popover stays the one thing Escape / outside-clicks close.
 */
export function useMenuEngine<A>({
  open,
  items,
  subItems,
  renderItem,
  clearOnLeave,
  onPick,
}: {
  /** The host popover's open state — false keeps every submenu closed as it fades out. */
  open: boolean;
  items: ReadonlyArray<A | MenuDecoration>;
  subItems: SubItems<A>;
  renderItem: RenderItem<A>;
  /** Click-driven menus (right-click / trigger): open with no wash and drop it
   *  when the pointer leaves. Combobox hosts (mention picker) keep a resting
   *  first-row highlight so Enter commits the top match, so they set this false. */
  clearOnLeave: boolean;
  onPick: (action: A) => void;
}) {
  // Native model: the highlight is a path of indexes, one per open level; the
  // last entry is the single active highlight, ancestors keep the open-row wash.
  // `null` = dormant: no row washed at all (set when the pointer leaves).
  const [path, setPath] = useState<number[] | null>([]);

  /** Whether the menu consumed the key (false = let the host, e.g. the editor caret, handle it). */
  const handleKey = useEvent((key: string): boolean => {
    if (path === null) {
      // Dormant: only an arrow key re-engages, landing on the first row.
      if (key !== "ArrowDown" && key !== "ArrowUp") return false;
      const first = firstSelectable(items, renderItem);
      if (first === -1) return false;
      setPath([first]);
      return true;
    }
    const levels = resolveLevels(path, items, subItems, renderItem);
    const active = levels.at(-1);
    if (active === undefined) return false;
    const effective = levels.map(level => level.index);

    if (key === "ArrowDown" || key === "ArrowUp") {
      const next = stepFrom(active.list, active.index, key === "ArrowDown" ? 1 : -1, renderItem);
      setPath([...effective.slice(0, -1), next]);
      return true;
    } else if (key === "ArrowRight") {
      const children = subItems(active.list[active.index] as A);
      const first = children == null ? -1 : firstSelectable(children, renderItem);
      if (first === -1) return levels.length > 1; // consumed no-op deep in, the host's at the root
      setPath([...effective, first]);
      return true;
    } else if (key === "ArrowLeft") {
      if (levels.length === 1) return false;
      setPath(effective.slice(0, -1));
      return true;
    } else if (key === "Enter" || key === "Tab") {
      onPick(active.list[active.index] as A);
      return true;
    } else {
      return false;
    }
  });

  const reset = useEvent(() => setPath([]));
  const clearHighlight = useEvent(() => {
    if (clearOnLeave) setPath(null);
  });

  const levels = path === null ? [] : resolveLevels(path, items, subItems, renderItem);

  // Drop the wash when the pointer leaves every panel — a move into a submenu
  // (its own portalled panel, also tagged data-context-menu) stays "inside".
  const leaveMenu = (e: React.MouseEvent) => {
    const to = e.relatedTarget;
    if (to instanceof Element && to.closest("[data-context-menu]")) return;
    clearHighlight();
  };

  const ctx: LevelContext<A> = {
    open,
    levels,
    renderItem,
    subItems,
    setActive: setPath,
    onPick,
    leaveMenu,
  };

  return {
    rows: renderLevel(items, 0, ctx),
    handleKey,
    reset,
    clearHighlight,
    leaveMenu,
  };
}

// A submenu-parent row anchors a bare Popper surface — floating-ui positioning
// and collision flipping, but NO dismiss layer of its own. It's mounted
// (portalled past the panel's overflow clip) exactly while the row is on the
// highlight path — highlighting a parent previews its children (nothing washed
// inside) until ArrowRight or hover descends into them.
function renderLevel<A>(list: ReadonlyArray<A | MenuDecoration>, depth: number, ctx: LevelContext<A>): ReactNode {
  const { open, levels, renderItem, subItems, setActive, onPick, leaveMenu } = ctx;
  return list.map((entry, i) => {
    if (isDecoration(entry)) return renderDecoration(entry, i);

    const item = renderItem(entry);
    const disabled = isDisabled(item);
    const children = disabled ? null : subItems(entry);
    const hasChildren = children != null && children.length > 0;
    const onPath = levels[depth]?.index === i;
    const row = (
      <OptionRow
        key={i}
        role="menuitem"
        className={cn(item.variant === "destructive" && "text-error")}
        disabled={disabled}
        selected={onPath}
        // mousemove, not mouseenter: scrolling slides rows under a stationary
        // cursor and Chrome re-fires enter on the new hit target, yanking the
        // highlight. Real movement is the only hover signal a native menu obeys.
        onMouseMove={() => {
          if (onPath && levels.length === depth + 1) return;
          setActive([...levels.slice(0, depth).map(level => level.index), i]);
        }}
        // mousedown (not click) + preventDefault so hosts that must keep focus
        // (the mention editor) don't lose it to the row.
        onMouseDown={e => {
          e.preventDefault();
          onPick(entry);
        }}
        trailing={rowTrailing(item, hasChildren)}
      >
        {rowContent(item)}
      </OptionRow>
    );

    // A disabled row suppresses pointer events; wrap in a span so its tooltip
    // still fires on hover.
    if (typeof item.disabled === "object") {
      return (
        <Tooltip key={i} label={item.disabled.reason} side="right" className="max-w-xs">
          <span className="block">{row}</span>
        </Tooltip>
      );
    }
    if (!hasChildren) return row;
    return (
      <PopperPrimitive.Root key={i}>
        <PopperPrimitive.Anchor asChild>{row}</PopperPrimitive.Anchor>
        {open &&
          onPath &&
          createPortal(
            <PopperPrimitive.Content
              data-slot="context-menu-submenu"
              data-context-menu=""
              role="menu"
              side="right"
              align="start"
              sideOffset={SUBMENU_GAP}
              // Line the panel's first row up with the parent row, past the p-1.
              alignOffset={-5}
              collisionPadding={VIEWPORT_MARGIN}
              onMouseLeave={leaveMenu}
              className={styles.menu}
            >
              {renderLevel(children, depth + 1, ctx)}
            </PopperPrimitive.Content>,
            document.body
          )}
      </PopperPrimitive.Root>
    );
  });
}

function renderDecoration(entry: MenuDecoration, key: number): ReactNode {
  const decoration = decorationOf(entry);
  if (decoration.kind === "divider") return <div key={key} className="my-1 border-t" />;
  return (
    <div key={key} className="truncate px-2 pt-2 pb-1 text-sm font-medium text-text-3">
      {decoration.title}
    </div>
  );
}

function isDisabled(item: MenuItem): boolean {
  return item.disabled === true || typeof item.disabled === "object";
}

function isSelectable<A>(entry: A | MenuDecoration | undefined, renderItem: RenderItem<A>): entry is A {
  return entry !== undefined && !isDecoration(entry) && !isDisabled(renderItem(entry));
}

function firstSelectable<A>(list: ReadonlyArray<A | MenuDecoration>, renderItem: RenderItem<A>): number {
  return list.findIndex(entry => isSelectable(entry, renderItem));
}

function stepFrom<A>(
  list: ReadonlyArray<A | MenuDecoration>,
  from: number,
  delta: number,
  renderItem: RenderItem<A>
): number {
  for (let offset = 1; offset <= list.length; offset++) {
    const index = (((from + delta * offset) % list.length) + list.length) % list.length;
    if (isSelectable(list[index], renderItem)) return index;
  }
  return from;
}

// The stored path validated against the current item tree: level 0 snaps to
// the first selectable row when its stored index no longer points at one
// (items changed identity, e.g. finished loading); deeper levels only exist
// while their stored index is still valid.
function resolveLevels<A>(
  path: number[],
  items: ReadonlyArray<A | MenuDecoration>,
  subItems: SubItems<A>,
  renderItem: RenderItem<A>
): Array<Level<A>> {
  const levels: Array<Level<A>> = [];
  let list = items;
  for (let depth = 0; depth < Math.max(path.length, 1); depth++) {
    const stored = path.at(depth);
    let index = stored !== undefined && isSelectable(list[stored], renderItem) ? stored : -1;
    if (index === -1) {
      if (depth > 0) break;
      index = firstSelectable(list, renderItem);
      if (index === -1) break;
    }
    levels.push({ list, index });
    const children = depth + 1 < path.length ? subItems(list[index] as A) : null;
    if (children == null || children.length === 0) break;
    list = children;
  }
  return levels;
}

function rowContent(item: MenuItem): ReactNode {
  const accessory = item.accessory;
  if (accessory !== undefined && "checked" in accessory) {
    return (
      <span className="flex h-8 min-w-0 flex-1 items-center gap-2 px-2 text-base">
        <Check className={cn("size-4 shrink-0 text-accent-1", !accessory.checked && "opacity-0")} />
        <span className="truncate">{item.label}</span>
      </span>
    );
  } else if (item.description !== undefined) {
    return (
      <span className="min-w-0 flex-1 p-2">
        <span className="block text-base font-medium">{item.label}</span>
        <span className="block text-sm text-text-3">{item.description}</span>
      </span>
    );
  } else {
    return <ButtonLabel size="m" icon={item.icon} text={item.label} />;
  }
}

function rowTrailing(item: MenuItem, hasChildren: boolean): ReactNode {
  const accessory = item.accessory;
  if (hasChildren || (accessory !== undefined && "children" in accessory)) {
    return <CaretRight className="size-4 text-text-3" />;
  } else if (accessory !== undefined && "custom" in accessory) {
    return accessory.custom;
  } else {
    return null;
  }
}
