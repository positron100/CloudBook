import { AnimatePresence, m } from "framer-motion";
import { useToast, type ToastType } from "@/context/ToastContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { duration, ease, spring } from "@/utils/motion";
import { Icon, type IconName } from "./Icon";
import { IconButton } from "./IconButton";
import "./ToastRegion.css";

const ICON: Record<ToastType, IconName> = {
  success: "check",
  error: "alert-circle",
  info: "info",
  warning: "alert-triangle",
};

/**
 * The toast stack — a small stack of paper notes on the corner of the desk.
 * Mounted once in AppShell. `aria-live` announces new toasts without stealing
 * focus; errors are assertive. Each toast auto-dismisses (see ToastContext)
 * and has a manual close. The surface, elevation and motion match the rest of
 * CloudBook: warm float paper, a restrained shadow, a compact tinted glyph
 * chip, and a spring entrance with one small settle. Reduced motion → fade only.
 */
export function ToastRegion() {
  const { toasts, dismiss } = useToast();
  const reduceMotion = useReducedMotion();

  return (
    <div className="toast-region" role="region" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role={toast.type === "error" ? "alert" : "status"}
            aria-live={toast.type === "error" ? "assertive" : "polite"}
            layout={reduceMotion ? false : "position"}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: 12, scale: 0.98, transition: { duration: duration.fast, ease: ease.exit } }
            }
            transition={reduceMotion ? { duration: duration.fast } : spring.settle}
          >
            <span className="toast__glyph" aria-hidden="true">
              <Icon name={ICON[toast.type]} size={15} />
            </span>
            <div className="toast__text">
              {toast.title && <p className="toast__title">{toast.title}</p>}
              <p className="toast__message">{toast.message}</p>
            </div>
            <IconButton
              icon="x"
              label="Dismiss"
              size="sm"
              className="toast__close"
              onClick={() => dismiss(toast.id)}
            />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
