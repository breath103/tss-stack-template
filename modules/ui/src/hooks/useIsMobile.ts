import { useEffect, useState } from "react";

// Matches the `mobile:` Tailwind variant breakpoint in global.css.
const MOBILE_QUERY = "(max-width: 767px)";

/** Whether the viewport is phone-sized. Use only when mobile needs a *behavior*
 *  branch (e.g. not mounting the sidebar resize handle), not just a style
 *  override — pure `mobile:` classes are preferred where they suffice. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}
