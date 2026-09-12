import { useEffect, useMemo, useRef } from "react";
import { m } from "framer-motion";
import { useTypingSignal } from "@/hooks/useTypingSignal";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./AmbientCubeField.css";

const CUBE_COUNT = 16;

/** Deterministic per-(seed, index) pseudo-random in [0, 1) — mulberry32. Same
 *  seed + index always gives the same value, so a cube's target is a pure
 *  function of the current typing seed, never a random walk. */
function rand(seed: number, index: number): number {
  let t = (seed * 374761393 + index * 668265263) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface Cube {
  /** Stable per-cube identity — only the typing target (x, yOffset) ever
   *  changes; every other field is fixed for the cube's lifetime. */
  key: number;
  baseLeft: number; // %, the horizontal position typing perturbs around
  size: number;
  depth: number; // 0 (far, small/faint) .. 1 (near, large/crisp)
  spawnTopVh: number; // vh, where this cube's rise cycle starts
  durationSec: number; // full spawn→exit→loop time
  delaySec: number; // negative — staggers phase from frame 1
  rotateEnd: number; // deg, signed — direction varies per cube
  opacityPeak: number;
}

/**
 * The ambient environment behind the UI — modelled on Compile Palace's actual
 * runtime behaviour (index.css `@keyframes float`, not the dead, unused
 * App.css bob that an earlier pass mistakenly read as authoritative): each
 * block spawns low, rises in a straight line the full height of the
 * viewport, rotates once over the trip, fades in then out, and loops —
 * never bobbing in place. Two independent layers per cube, matching the
 * spec's "base motion vs. interaction" split:
 *
 *   .ambient-cubes__slot      — framer spring, typing-driven (left %, y vh
 *                                nudge). Never touches the rise.
 *   .ambient-cubes__parallax  — pointer drift, direct DOM write.
 *   .ambient-cubes__cube      — the continuous CSS `@keyframes cube-rise`:
 *                                spawn → rise → rotate → fade → loop. This
 *                                animation is never paused, restarted or
 *                                reparented by typing — only its ancestors
 *                                shift under it — so the upward flight can
 *                                never be interrupted by a repositioning.
 */
export function AmbientCubeField() {
  const reduce = useReducedMotion();
  const seed = useTypingSignal();
  const rootRef = useRef<HTMLDivElement>(null);

  const cubes = useMemo<Cube[]>(
    () =>
      Array.from({ length: CUBE_COUNT }, (_, i) => {
        const depth = rand(1, i * 8 + 1);
        const durationSec = 20 + rand(1, i * 8 + 5) * 38;
        return {
          key: i,
          baseLeft: 4 + rand(1, i * 8 + 2) * 92,
          size: 12 + rand(1, i * 8 + 3) * 28,
          depth,
          spawnTopVh: -15 + rand(1, i * 8 + 4) * 120,
          durationSec,
          delaySec: -rand(1, i * 8 + 6) * durationSec,
          rotateEnd: (rand(1, i * 8 + 7) < 0.5 ? -1 : 1) * 360,
          opacityPeak: 0.2 + depth * 0.4,
        };
      }),
    [],
  );

  // Subtle pointer parallax — fine pointers only, off under reduced motion.
  // Written straight to a CSS custom property (no React state per move), the
  // same pattern NoteCard's own pointer light already uses.
  useEffect(() => {
    if (reduce || !window.matchMedia?.("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      root.style.setProperty("--cube-parallax-x", `${nx}`);
      root.style.setProperty("--cube-parallax-y", `${ny}`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce]);

  return (
    <div ref={rootRef} className="ambient-cubes" aria-hidden="true">
      {cubes.map((cube) => {
        // Typing target is a pure function of (seed, cube identity) — an
        // unchanged seed (no typing yet) resolves to the cube's own resting
        // spot, so nothing jumps on mount before the first keystroke.
        const x = seed === 0 ? cube.baseLeft : 4 + rand(seed, cube.key * 3 + 1) * 92;
        const yOffset = seed === 0 ? 0 : (rand(seed, cube.key * 3 + 2) * 2 - 1) * 14;
        return (
          <m.div
            key={cube.key}
            className="ambient-cubes__slot"
            initial={false}
            animate={{ left: `${x}%`, y: `${yOffset}vh` }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 40, damping: 18, mass: 1.4 }
            }
          >
            <div
              className="ambient-cubes__parallax"
              style={{ "--cube-parallax-depth": 0.4 + cube.depth * 0.6 } as React.CSSProperties}
            >
              <div
                className="ambient-cubes__cube"
                data-reduce={reduce || undefined}
                style={
                  {
                    width: cube.size,
                    height: cube.size,
                    "--cube-spawn-top": `${cube.spawnTopVh}vh`,
                    "--cube-duration": `${cube.durationSec}s`,
                    "--cube-delay": `${cube.delaySec}s`,
                    "--cube-rotate-end": `${cube.rotateEnd}deg`,
                    "--cube-opacity-peak": cube.opacityPeak,
                  } as React.CSSProperties
                }
              />
            </div>
          </m.div>
        );
      })}
    </div>
  );
}
