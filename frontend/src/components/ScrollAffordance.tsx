import { m } from "framer-motion";
import { Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { duration, ease } from "@/utils/motion";
import "./ScrollAffordance.css";

/**
 * A quiet "there is more below" cue. Shows while `visible`, fades out at the
 * last section. Clicking it advances to the next section. Purely an
 * affordance — ArrowDown does the same thing.
 */
export function ScrollAffordance({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  const reduce = useReducedMotion();

  return (
    <m.button
      type="button"
      className="scroll-affordance"
      onClick={onClick}
      aria-label="Next section"
      tabIndex={visible ? 0 : -1}
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
      transition={{ duration: duration.base, ease: ease.standard }}
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <m.span
        className="scroll-affordance__chevron"
        aria-hidden="true"
        animate={reduce ? undefined : { y: [0, 4, 0] }}
        transition={reduce ? undefined : { duration: 1.8, ease: "easeInOut", repeat: Infinity }}
      >
        <Icon name="chevron-down" size={18} />
      </m.span>
    </m.button>
  );
}
