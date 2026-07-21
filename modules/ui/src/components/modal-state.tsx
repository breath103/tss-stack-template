import { AnimatePresence } from "motion/react";
import {
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { ConfirmDialog } from "./ConfirmDialog";

const stopPropagation = (e: SyntheticEvent) => e.stopPropagation();

function PortalEventBoundary({ children }: { children: ReactNode }) {
  return (
    <div
      onContextMenu={stopPropagation}
      onPointerDown={stopPropagation}
      onPointerUp={stopPropagation}
      onClick={stopPropagation}
      onDoubleClick={stopPropagation}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key !== "Escape") e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

let nextId = 0;

export type ConfirmFn = ReturnType<typeof useModal>["confirm"];

export function useModal() {
  const [stack, setStack] = useState<{ id: number; node: ReactNode }[]>([]);

  const removeModal = useCallback((id: number) => {
    setStack(prev => prev.filter(m => m.id !== id));
  }, []);

  const openModal = useCallback(
    <const T extends object>(Component: ComponentType<T & { onClose: () => void }>, props: T) => {
      const id = nextId++;
      const componentProps = { ...props, onClose: () => removeModal(id) };
      setStack(prev => [
        ...prev,
        {
          id,
          node: <Component key={id} {...componentProps} />,
        },
      ]);
    },
    [removeModal]
  );

  const confirm = useCallback(
    (options: {
      title: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
      onConfirm?: () => void | Promise<unknown>;
    }): Promise<boolean> => {
      return new Promise<boolean>((resolve, reject) => {
        let settled = false;
        const id = nextId++;
        const close = (result: boolean | Error) => {
          if (settled) return;
          settled = true;
          removeModal(id);
          if (result instanceof Error) reject(result);
          else resolve(result);
        };
        setStack(prev => [
          ...prev,
          {
            id,
            node: (
              <ConfirmDialog
                key={id}
                title={options.title}
                description={options.description}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
                onClose={() => close(false)}
                onConfirm={options.onConfirm}
                onSettled={close}
              />
            ),
          },
        ]);
      });
    },
    [removeModal]
  );

  const container = typeof document !== "undefined" ? document.getElementById("modal-container") : null;

  const outlet = container
    ? createPortal(
        <PortalEventBoundary>
          <AnimatePresence>{stack.map(entry => entry.node)}</AnimatePresence>
        </PortalEventBoundary>,
        container
      )
    : null;

  return { openModal, confirm, outlet };
}
