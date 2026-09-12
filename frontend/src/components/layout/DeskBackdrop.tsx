import { AmbientCubeField } from "./AmbientCubeField";
import "./DeskBackdrop.css";

/**
 * The ambient "desk" — a couple of very soft, out-of-focus warm blooms behind
 * all content (the ::before/::after in DeskBackdrop.css), plus the animated
 * cube field (AmbientCubeField) on top of them, still behind everything real.
 * Pure CSS/DOM, no WebGL — see AmbientCubeField.tsx for why.
 */
export function DeskBackdrop() {
  return (
    <div className="desk-backdrop" aria-hidden="true">
      <AmbientCubeField />
    </div>
  );
}
