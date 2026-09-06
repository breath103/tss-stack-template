import { z } from "zod";

import { LocalStoredValue } from "../lib/local-stored-value";

interface ResizableWidthConfig {
  defaultWidth: number;
  maxWidth: number;
  minWidth: number;
}

export function clampResizableWidth(width: number, config: ResizableWidthConfig) {
  if (!Number.isFinite(width) || width <= 0) return config.defaultWidth;
  return Math.min(config.maxWidth, Math.max(config.minWidth, width));
}

// One slot per resizable surface. The typed LocalStoredValue is constructed
// once here; callers pass the store to ResizableEdge (which reads its bounds
// for aria attrs and calls save() on drag-end) and to the initial-read site.
export class ResizableWidthStore {
  private readonly store: LocalStoredValue<number>;
  readonly defaultWidth: number;
  readonly minWidth: number;
  readonly maxWidth: number;

  constructor(config: ResizableWidthConfig & { storageKey: string }) {
    this.defaultWidth = config.defaultWidth;
    this.minWidth = config.minWidth;
    this.maxWidth = config.maxWidth;
    this.store = new LocalStoredValue(config.storageKey, z.number());
  }

  read(): number {
    const stored = this.store.load();
    if (stored === null) return this.defaultWidth;
    return clampResizableWidth(stored, this);
  }

  save(width: number): void {
    this.store.save(width);
  }
}
