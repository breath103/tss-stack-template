import { type ReactNode } from "react";
import { type IconComponent } from "../icon";

/** Min distance any panel keeps from a viewport edge (root popover + submenus). */
export const VIEWPORT_MARGIN = 8;

const DECORATION = Symbol("menu-decoration");

/** Non-selectable structure rows — splice freely between actions at any level. */
export type MenuDecoration = { [DECORATION]: "divider" } | { [DECORATION]: "group"; title: string };

export const divider: MenuDecoration = { [DECORATION]: "divider" };

export function group(title: string): MenuDecoration {
  return { [DECORATION]: "group", title };
}

export function isDecoration(entry: unknown): entry is MenuDecoration {
  return typeof entry === "object" && entry !== null && DECORATION in entry;
}

export function decorationOf(entry: MenuDecoration): { kind: "divider" } | { kind: "group"; title: string } {
  return entry[DECORATION] === "divider" ? { kind: "divider" } : { kind: "group", title: entry.title };
}

export type MenuItem = {
  label: string;
  icon?: IconComponent;
  /** Second line under the label. */
  description?: string;
  variant?: "default" | "destructive";
  /** The row's single accessory — mutually exclusive: a leading check toggle
   *  (the slot stays occupied while unchecked), the submenu chevron (rows with
   *  children get it automatically — declare it only to force one), or a
   *  custom trailing node (a tag, <ShortcutLabel/>, …). */
  accessory?: { checked: boolean } | { children: true } | { custom: ReactNode };
  /** Dimmed; arrow nav skips it; never commits or opens children. Pass
   *  `{ reason }` to also explain why, in a tooltip. */
  disabled?: boolean | { reason: string };
};

export type RenderItem<A> = (action: A) => MenuItem;

/** A level's items: null/undefined = leaf (no children). */
export type SubItems<A> = (action: A) => ReadonlyArray<A | MenuDecoration> | null | undefined;
