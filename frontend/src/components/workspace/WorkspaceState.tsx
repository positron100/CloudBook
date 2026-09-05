import { Button, Icon, type IconName } from "@/components/ui";
import { Reveal } from "@/components/motion";
import "./WorkspaceState.css";

interface WorkspaceStateProps {
  icon: IconName;
  title: string;
  body: string;
  tone?: "calm" | "error";
  action?: { label: string; onClick: () => void };
}

/** The one deliberate full-panel state — empty desk, no filter results, or a
 *  load error. Not a placeholder: it always says what happened and what to do. */
export function WorkspaceState({ icon, title, body, tone = "calm", action }: WorkspaceStateProps) {
  return (
    <Reveal as="div" onView={false} className={`ws-state ws-state--${tone}`}>
      <span className="ws-state__glyph" aria-hidden="true">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="ws-state__title">{title}</h2>
      <p className="ws-state__body">{body}</p>
      {action && (
        <Button variant={tone === "error" ? "secondary" : "primary"} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Reveal>
  );
}
