import { useCallback, useInsertionEffect, useRef } from "react";

// Stable-identity callback (React's useEffectEvent RFC). Returned ref never
// changes; body always runs the latest `fn`. Do NOT use as a useEffect dep —
// it won't fire when captured state changes.
export function useEvent<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const ref = useRef(fn);
  useInsertionEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: TArgs) => ref.current(...args), []);
}
