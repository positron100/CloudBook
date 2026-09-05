import { AnimatePresence, m } from "framer-motion";
import { useToast, type ToastType } from "@/context/ToastContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { duration, ease } from "@/utils/motion";
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
 * Renders the toast stack. Mounted once in AppShell. `aria-live` announces new
 * toasts without stealing focus; errors are assertive. Each toast auto-dismisses
 * (see ToastContext) and has a manual close. Reduced motion → no slide/fade.
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
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, x: 16, transition: { duration: duration.fast, ease: ease.exit } }
            }
            transition={{ duration: duration.base, ease: ease.entrance }}
          >
            <Icon name={ICON[toast.type]} size={18} className="toast__icon" />
            <span className="toast__message">{toast.message}</span>
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
