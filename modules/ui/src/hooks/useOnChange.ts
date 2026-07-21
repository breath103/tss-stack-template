import type { DependencyList } from "react";
import { useEffect, useRef } from "react";

/**
 * Runs callback once per unique dependency values.
 * For fire-and-forget effects without cleanup.
 * Prevents React 18 Strict Mode from double-firing.
 */
export function useOnChange(callback: () => void | Promise<void>, deps: DependencyList) {
  const lastDeps = useRef<DependencyList | null>(null);

  useEffect(() => {
    if (lastDeps.current && depsEqual(lastDeps.current, deps)) return;
    lastDeps.current = deps;
    void callback();
    // oxlint-disable-next-line react/exhaustive-deps
  }, deps);
}

function depsEqual(a: DependencyList, b: DependencyList) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
