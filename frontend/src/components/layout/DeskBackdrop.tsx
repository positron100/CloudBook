import "./DeskBackdrop.css";

/**
 * The ambient "desk" — a couple of very soft, out-of-focus warm blooms behind
 * all content. Pure CSS, static, decorative. Pointer parallax and the optional
 * WebGL sheet field arrive in P1.9; this is the always-on baseline and the
 * WebGL fallback.
 */
export function DeskBackdrop() {
  return <div className="desk-backdrop" aria-hidden="true" />;
}
