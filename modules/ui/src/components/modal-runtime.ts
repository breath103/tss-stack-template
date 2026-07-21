import { useEffect, useRef } from "react";

let inertRefCount = 0;

export function useInertBackground() {
  useEffect(() => {
    const container = document.getElementById("modal-container");
    if (!container) return;
    const siblings = [...container.parentElement!.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== container
    );
    inertRefCount++;
    siblings.forEach(el => (el.inert = true));
    return () => {
      inertRefCount--;
      if (inertRefCount === 0) siblings.forEach(el => (el.inert = false));
    };
  }, []);
}

const escapeStack: (() => void)[] = [];

export function isAnyModalOpen() {
  return escapeStack.length > 0;
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && !e.defaultPrevented && escapeStack.length > 0) {
      escapeStack[escapeStack.length - 1]();
    }
  });
}

export function useEscapeClose(onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handler = () => onCloseRef.current();
    escapeStack.push(handler);
    return () => {
      const idx = escapeStack.indexOf(handler);
      if (idx >= 0) escapeStack.splice(idx, 1);
    };
  }, []);
}
