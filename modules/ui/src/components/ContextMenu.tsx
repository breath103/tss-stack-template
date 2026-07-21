import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Slot } from "@radix-ui/react-slot";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useEvent } from "../lib/use-event";
import { useMenuEngine } from "./ContextMenu/menu-engine";
import { divider, group, type MenuDecoration, type MenuItem, VIEWPORT_MARGIN } from "./ContextMenu/types";
import styles from "./ContextMenu.module.css";

export { divider, group, type MenuDecoration };

// A context menu IS a popover. This hook owns the whole thing — opening,
// positioning, the panel, keyboard nav, submenus, commit. Consumers declare
// lightweight action VALUES; rendering and the single commit callback are
// separate layers (see ContextMenu/menu-engine), evaluated only for rows on
// screen / actually triggered:
//
//   const menu = useContextMenu({
//     items: (target, parent) => parent === null ? ACTIONS : null,  // null = leaf
//     renderItem: (target, action) => ({ label, icon, ... }),
//     onClick: (target, action) => { ... },  // return false to keep the menu open
//   });
//   <ContextMenu contextMenu={menu} trigger={<Button/>} />   // click-anchored
//   menu.open(target, e)  +  <ContextMenuPortal contextMenu={menu} />  // right-click / manual
//
// Design: documents/features/2026-07-05_context-menu-popover-migration.md

/** Where to open: a right-click/mouse event (point, preventDefaulted), an element (its box), or a rect. */
type MenuAnchor = Element | DOMRect | Pick<globalThis.MouseEvent, "clientX" | "clientY" | "preventDefault">;

export interface ContextMenuController<T, A> {
  open: (target: T, at: MenuAnchor) => void;
  /** Feed keys from a host that keeps focus (the mention editor). True = consumed. */
  handleKey: (key: string) => boolean;
  /** Highlight back to the top — call when the item set changes under an open menu (query typed). */
  reset: () => void;
  /** Wiring consumed by <ContextMenuPortal>. */
  portalProps: {
    state: { target: T; rect: DOMRect } | null;
    isOpen: boolean;
    close: () => void;
    engineRef: React.RefObject<{ handleKey: (key: string) => boolean; reset: () => void } | null>;
    config: ContextMenuConfig<T, A>;
  };
}

interface ContextMenuConfig<T, A> {
  /** The action values at one level: `parent === null` is the root; null = leaf.
   *  Called lazily per open level (plus per visible row to probe for a chevron),
   *  so nothing below the surface is built until the user actually goes there.
   *  Must be cheap and pure — it runs during nav and render. */
  items: (target: T, parent: A | null) => ReadonlyArray<A | MenuDecoration> | null | undefined;
  /** How an action looks. Called only for rows actually rendered — never for decorations. */
  renderItem: (target: T, action: A) => MenuItem;
  /** The single commit point, fired on trigger only. Return false to keep the
   *  menu open (a submenu-parent row acting as a no-op). */
  onClick: (target: T, action: A) => void | false;
  align?: "start" | "end";
  /** Off for hosts that keep focus and feed keys via handleKey (the mention editor). */
  captureFocus?: boolean;
  /** Rendered in the panel when the root level is empty (loading / no results). */
  emptyState?: ReactNode;
}

export type StaticMenuItem = MenuItem & {
  /** Leaf commit. Omit on a submenu parent — clicking it keeps the menu open. */
  onClick?: () => void;
  children?: ReadonlyArray<StaticMenuItem | MenuDecoration>;
};

/** Declarative form for small fixed menus — the row IS its own item/action:
 *  `useContextMenu({ ...fromStaticItems((target) => [...]), align: "end" })`.
 *  Builds the whole tree per render; use the raw items/renderItem/onClick triple
 *  when levels are large or expensive (it stays lazy per open level). */
export function fromStaticItems<T = null>(
  build: (target: T) => ReadonlyArray<StaticMenuItem | MenuDecoration>
): Pick<ContextMenuConfig<T, StaticMenuItem>, "items" | "renderItem" | "onClick"> {
  return {
    items: (target, parent) => (parent === null ? build(target) : (parent.children ?? null)),
    renderItem: (_target, item) => item,
    onClick: (_target, item) => {
      if (item.onClick === undefined) return false;
      item.onClick();
    },
  };
}

function pointRect(x: number, y: number): DOMRect {
  return { x, y, top: y, left: x, right: x, bottom: y, width: 0, height: 0, toJSON: () => ({}) };
}

function anchorRect(at: MenuAnchor): DOMRect {
  if (at instanceof Element) return at.getBoundingClientRect();
  if ("clientX" in at) {
    at.preventDefault();
    return pointRect(at.clientX, at.clientY);
  }
  return at;
}

export function useContextMenu<T, A>(config: ContextMenuConfig<T, A>): ContextMenuController<T, A> {
  // `state` holds the open target + anchor rect; `isOpen` drives the popover.
  const [state, setState] = useState<{ target: T; rect: DOMRect } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const engineRef = useRef<{ handleKey: (key: string) => boolean; reset: () => void } | null>(null);

  const open = useEvent((target: T, at: MenuAnchor) => {
    setState({ target, rect: anchorRect(at) });
    setIsOpen(true);
  });
  const close = useEvent(() => setIsOpen(false));
  const handleKey = useEvent((key: string) => engineRef.current?.handleKey(key) ?? false);
  const reset = useEvent(() => engineRef.current?.reset());

  return { open, handleKey, reset, portalProps: { state, isOpen, close, engineRef, config } };
}

/** A trigger button: left click opens the menu anchored to it. Renders the portal itself. */
export function ContextMenu<T, A>({
  contextMenu,
  target,
  trigger,
}: {
  contextMenu: ContextMenuController<T, A>;
  /** Omit when the menu's items don't depend on a target (T = null). */
  target?: T;
  trigger: ReactNode;
}) {
  return (
    <>
      <Slot
        onClick={e => {
          e.preventDefault();
          contextMenu.open(target as T, e.currentTarget);
        }}
      >
        {trigger}
      </Slot>
      <ContextMenuPortal contextMenu={contextMenu} />
    </>
  );
}

/** Mount once next to `open()` callers (right-click lists, the mention editor). */
export function ContextMenuPortal<T, A>({ contextMenu }: { contextMenu: ContextMenuController<T, A> }) {
  const { state, isOpen, close, engineRef, config } = contextMenu.portalProps;
  const { align = "start", captureFocus = true } = config;
  // Radix anchors to whatever virtualRef.current.getBoundingClientRect() returns —
  // the open rect (a button's box, a right-click point, the caret).
  const virtualRef = useMemo(
    () => ({ current: { getBoundingClientRect: () => state?.rect ?? pointRect(0, 0) } }),
    [state?.rect]
  );
  const contentRef = useRef<HTMLDivElement>(null);

  const items = (state !== null ? config.items(state.target, null) : null) ?? [];
  const engine = useMenuEngine<A>({
    open: isOpen,
    items,
    subItems: action => (state !== null ? config.items(state.target, action) : null),
    renderItem: action => config.renderItem(state!.target, action),
    clearOnLeave: captureFocus,
    onPick: action => {
      if (config.onClick(state!.target, action) === false) return;
      close();
    },
  });
  useLayoutEffect(() => {
    engineRef.current = { handleKey: engine.handleKey, reset: engine.reset };
  }, [engineRef, engine.handleKey, engine.reset]);

  // Reopening on another target must not inherit the previous highlight path.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) engine.reset();
  }

  return (
    <PopoverPrimitive.Root
      open={isOpen}
      onOpenChange={o => {
        if (!o) close();
      }}
      modal={false}
    >
      <PopoverPrimitive.Anchor virtualRef={virtualRef} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={contentRef}
          data-slot="popover-content"
          data-context-menu=""
          role="menu"
          tabIndex={-1}
          align={align}
          side="bottom"
          sideOffset={4}
          collisionPadding={VIEWPORT_MARGIN}
          // Focus the panel itself (not the first row button) so arrow keys land on
          // onKeyDown below without painting a focus ring on a row.
          onOpenAutoFocus={e => {
            e.preventDefault();
            if (captureFocus) contentRef.current?.focus();
          }}
          // A non-focused host (the mention editor) must also keep focus on close.
          onCloseAutoFocus={e => {
            if (!captureFocus) e.preventDefault();
          }}
          onKeyDown={e => {
            if (engine.handleKey(e.key)) e.preventDefault();
          }}
          // Submenus are portalled Popper surfaces, not their own dismiss layers,
          // so a pointer-down inside one reads as "outside" this panel — keep the
          // menu open and let the submenu row's own mousedown commit.
          onInteractOutside={e => {
            const target = e.detail.originalEvent.target;
            if (target instanceof Element && target.closest("[data-context-menu]")) e.preventDefault();
          }}
          onMouseLeave={engine.leaveMenu}
          className={styles.menu}
        >
          {items.length === 0 ? config.emptyState : engine.rows}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
