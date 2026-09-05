import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { IconButton } from "./IconButton";
import "./Modal.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Footer actions (buttons). */
  footer?: ReactNode;
  className?: string;
}

/**
 * React-controlled dialog built on the native <dialog> element — focus trap,
 * Escape-to-close and inertness of the background come for free. We add:
 * focus restore to the trigger, a click-outside close, and a scale/fade
 * entrance (disabled under reduced motion in Modal.css).
 */
export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      restoreFocusTo.current = document.activeElement as HTMLElement | null;
      // jsdom (tests) may not implement showModal — fall back to the open attr.
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Native `cancel` fires on Escape; `close` fires however it closed.
    const handleClose = () => {
      restoreFocusTo.current?.focus?.();
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // The dialog element fills the viewport; a click that lands on it directly
    // (not on the inner panel) is a click on the backdrop.
    if (e.target === ref.current) ref.current?.close();
  };

  return (
    <dialog ref={ref} className={cn("modal", className)} onClick={onBackdropClick} aria-labelledby="modal-title">
      <div className="modal__panel">
        <header className="modal__header">
          <h2 id="modal-title" className="modal__title">
            {title}
          </h2>
          <IconButton icon="x" label="Close" size="sm" onClick={() => ref.current?.close()} />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
