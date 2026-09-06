import { useCallback, useEffect, useRef, useState } from "react";
import { m, useMotionValue, useTransform, animate } from "framer-motion";
import { Icon } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ease } from "@/utils/motion";
import { EDGE_FLAT, EDGE_NICK, EDGE_HALF, EDGE_TORN, EDGE_SETTLE } from "@/components/workspace/TearSheet";
import { introDestinations, type IntroDestination } from "@/lib/introDestinations";
import "./IntroScene.css";

interface IntroSceneProps {
  destination: IntroDestination;
  onDone: () => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Resting offsets for the flipping pages — a stack with a little character
 *  (framer owns the transform, so these can't live in CSS). */
const PAGE_REST = [
  { x: 2, y: 1, z: -1.5, rotateZ: -0.5 },
  { x: 3.5, y: 2, z: -3, rotateZ: 0.4 },
  { x: 5, y: 3, z: -4.5, rotateZ: -0.3 },
] as const;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A centred sheet roughly the size of any destination surface — used when the
 *  real element cannot be measured (slow route, unknown DOM). */
function fallbackRect(vw: number, vh: number): Box {
  const width = Math.min(560, vw * 0.9);
  const height = Math.min(vh * 0.72, 620);
  return { left: (vw - width) / 2, top: (vh - height) / 2 + 8, width, height };
}

/**
 * The signature opening: a small CloudBook journal drops onto the desk and
 * opens, a few pages flip, one page separates, tears from the binding with the
 * same edge language as Notes, and hand-carries forward — reforming to the
 * *measured* rect of the real destination surface underneath (notebook, auth
 * page, letter, profile sheet). A circular reveal then opens a hole over that
 * surface and spreads out to the desk and the nav.
 *
 * The real destination is already rendered underneath at that exact rect, in
 * the same paper material, so when the reveal passes there is no swap frame —
 * the page simply became the interface.
 *
 * All CSS transforms + Framer motion values. No canvas, no WebGL, no per-frame
 * React state. Reduced motion never mounts this (see IntroOrchestrator).
 */
export function IntroScene({ destination, onDone }: IntroSceneProps) {
  const reduce = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const chosenRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  // Book
  const bookY = useMotionValue(10);
  const bookScale = useMotionValue(0.9);
  const bookFade = useMotionValue(0);
  const coverRot = useMotionValue(-4);
  const pf0 = useMotionValue(0);
  const pf1 = useMotionValue(0);
  const pf2 = useMotionValue(0);
  const chosenLift = useMotionValue(0);
  const chosenY = useTransform(chosenLift, (v) => -v * 7);
  const chosenGlow = useMotionValue(0);
  const chosenBright = useTransform(chosenGlow, (v) => `brightness(${1 + v * 0.07})`);

  // Flyer — the page that leaves the book
  const [flyBox, setFlyBox] = useState<Box | null>(null);
  const fOpacity = useMotionValue(0);
  const fx = useMotionValue(0);
  const fy = useMotionValue(0);
  const fsx = useMotionValue(1);
  const fsy = useMotionValue(1);
  const frot = useMotionValue(0);
  const fskew = useMotionValue(0);
  const fclip = useMotionValue(EDGE_FLAT);
  const flift = useMotionValue(0);
  const bindT = useMotionValue(0);

  // Circular reveal
  const revealR = useMotionValue(0);
  const [revealing, setRevealing] = useState(false);
  const [center, setCenter] = useState({ x: "50%", y: "50%" });

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;

    // QA aid — `?introslow` stretches the whole sequence 6× so it can be
    // watched frame by frame. Default 1×; no effect in production.
    const TS = (() => {
      try {
        return new URLSearchParams(window.location.search).has("introslow") ? 6 : 1;
      } catch {
        return 1;
      }
    })();
    const nap = (ms: number) => sleep(ms * TS);

    const skip = () => {
      if (doneRef.current || cancelled) return;
      cancelled = true;
      const maxR = Math.hypot(window.innerWidth, window.innerHeight);
      animate(revealR, maxR, { duration: TS * 0.22, ease: "easeIn" }).then(finish);
    };

    const run = async () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sel = introDestinations[destination].selector;

      // Resolve the destination surface — poll briefly, then fall back.
      let target = document.querySelector(sel)?.getBoundingClientRect();
      for (let i = 0; (!target || target.width < 40) && i < 18; i++) {
        await nap(35);
        if (cancelled) return;
        target = document.querySelector(sel)?.getBoundingClientRect();
      }
      const t: Box =
        target && target.width >= 40
          ? { left: target.left, top: target.top, width: target.width, height: target.height }
          : fallbackRect(vw, vh);

      setCenter({ x: `${t.left + t.width / 2}px`, y: `${t.top + t.height / 2}px` });

      // The flyer starts exactly over the book's chosen page.
      const pr = chosenRef.current?.getBoundingClientRect();
      const page: Box = pr
        ? { left: pr.left, top: pr.top, width: pr.width, height: pr.height }
        : { left: vw / 2 - 90, top: vh / 2 - 120, width: 180, height: 240 };
      setFlyBox(page);

      if (reduce) {
        finish();
        return;
      }

      const dx = t.left - page.left;
      const dy = t.top - page.top;
      const sX = t.width / page.width;
      const sY = t.height / page.height;

      // --- the journal drops in and opens ---
      animate(bookFade, 1, { duration: TS * 0.16 });
      await Promise.all([
        animate(bookScale, 1, { duration: TS * 0.34, ease: ease.entrance }),
        animate(bookY, -4, { duration: TS * 0.34, ease: ease.entrance }),
        animate(coverRot, -150, { duration: TS * 0.42, ease: ease.entrance }),
      ]);
      if (cancelled) return;

      // --- pages flip: staggered, each a little different ---
      animate(pf0, -164, { duration: TS * 0.3, ease: [0.4, 0, 0.3, 1] });
      await nap(85);
      animate(pf1, -171, { duration: TS * 0.27, ease: [0.4, 0, 0.3, 1] });
      await nap(80);
      animate(pf2, -166, { duration: TS * 0.31, ease: [0.4, 0, 0.3, 1] });
      await nap(150);
      if (cancelled) return;

      // --- one page is chosen: it lifts off the stack and catches the light ---
      await Promise.all([
        animate(chosenLift, 1, { duration: TS * 0.16, ease: "easeOut" }),
        animate(chosenGlow, 1, { duration: TS * 0.16 }),
      ]);
      await nap(70);
      if (cancelled) return;

      // hand the chosen page to the flyer — same paper, same place, same frame
      fOpacity.set(1);

      // --- binding tension ---
      await Promise.all([
        animate(fy, 4, { duration: TS * 0.08, ease: "easeOut" }),
        animate(fsy, 1.02, { duration: TS * 0.08, ease: "easeOut" }),
        animate(fskew, -1.3, { duration: TS * 0.08, ease: "easeOut" }),
        animate(fclip, EDGE_NICK, { duration: TS * 0.08 }),
        animate(bindT, 1, { duration: TS * 0.09 }),
        animate(flift, 0.3, { duration: TS * 0.08 }),
      ]);
      if (cancelled) return;

      // --- release: the rip runs across, the page lifts, accelerating ---
      animate(fclip, [EDGE_NICK, EDGE_HALF, EDGE_TORN], {
        duration: 0.1,
        times: [0, 0.55, 1],
        ease: [0.3, 0, 0.4, 1],
      });
      animate(fsy, 1, { duration: TS * 0.12, ease: "easeOut" });
      animate(fy, -14, { duration: TS * 0.14, ease: [0.4, 0, 0.65, 1] });
      animate(frot, -2.4, { duration: TS * 0.14, ease: [0.4, 0, 0.65, 1] });
      animate(flift, 1, { duration: TS * 0.14, ease: "easeOut" });
      await nap(75);
      if (cancelled) return;

      // --- flight: hand-carry to the destination, reforming to its geometry ---
      const D = 0.5 * TS;
      const yFrom = fy.get();
      animate(fskew, [fskew.get(), 0.5, 0], { duration: D, ease: "easeInOut" });
      animate(flift, [1, 0.5, 0], { duration: D, ease: "easeInOut" });
      animate(bindT, 0, { duration: D * 0.6, ease: "easeOut" });
      animate(fclip, [EDGE_TORN, EDGE_SETTLE, EDGE_FLAT], {
        duration: D * 0.7,
        times: [0, 0.45, 1],
        ease: "easeOut",
      });
      await Promise.all([
        animate(fx, dx, { duration: D, ease: [0.22, 0.55, 0.3, 1] }),
        animate(fy, [yFrom, dy - 20, dy], {
          duration: D,
          times: [0, 0.52, 1],
          ease: ["easeOut", "easeInOut"],
        }),
        animate(frot, [frot.get(), 1, 0.2, 0], {
          duration: D,
          times: [0, 0.42, 0.78, 1],
          ease: "easeInOut",
        }),
        animate(fsx, [1, 1, lerp(1, sX, 0.7), sX], {
          duration: D,
          times: [0, 0.24, 0.68, 1],
          ease: [0.3, 0, 0.3, 1],
        }),
        animate(fsy, [1, 1, lerp(1, sY, 0.7), sY], {
          duration: D,
          times: [0, 0.24, 0.68, 1],
          ease: [0.3, 0, 0.3, 1],
        }),
      ]);
      if (cancelled) return;

      // --- circular reveal: a hole opens over the destination and spreads to
      //     the desk, then the nav at the edges. The mask only exists during
      //     this phase — before it, the scene is a plain opaque layer. ---
      const startR = Math.min(t.width, t.height) * 0.35;
      revealR.set(startR);
      setRevealing(true);
      await nap(16);
      const maxR = Math.hypot(vw, vh) * 1.05;
      await animate(revealR, maxR, { duration: TS * 0.44, ease: [0.65, 0, 0.35, 1] });
      finish();
    };

    void run();

    // Safety net — never trap the user behind the book if a stage stalls. The
    // sequence itself runs well under this.
    const cap = window.setTimeout(finish, 5000 * Math.max(TS, 1));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    const el = sceneRef.current;
    el?.addEventListener("pointerdown", skip);

    return () => {
      cancelled = true;
      window.clearTimeout(cap);
      window.removeEventListener("keydown", onKey);
      el?.removeEventListener("pointerdown", skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <m.div
      ref={sceneRef}
      className="intro-scene"
      role="presentation"
      data-revealing={revealing || undefined}
      style={{
        ["--reveal-r" as string]: revealR,
        ["--reveal-cx" as string]: center.x,
        ["--reveal-cy" as string]: center.y,
      }}
    >
      <span className="sr-only" role="status">
        Opening CloudBook — {introDestinations[destination].label}
      </span>

      <m.div
        className="intro-book"
        style={{ y: bookY, scale: bookScale, opacity: bookFade, rotateX: 6, rotateZ: -0.6 }}
        aria-hidden="true"
      >
        <span className="intro-book__base" />
        <m.span className="intro-book__page" style={{ ...PAGE_REST[0], rotateY: pf0 }} />
        <m.span className="intro-book__page" style={{ ...PAGE_REST[1], rotateY: pf1 }} />
        <m.span className="intro-book__page" style={{ ...PAGE_REST[2], rotateY: pf2 }} />
        <m.div
          ref={chosenRef}
          className="intro-book__page intro-book__page--chosen intro-page"
          style={{ z: 0.5, y: chosenY, filter: chosenBright }}
        >
          <span className="intro-page__rules" />
          <span className="intro-page__binding" />
        </m.div>
        <m.div className="intro-book__cover" style={{ rotateY: coverRot, z: 5 }}>
          <span className="intro-book__mark">
            <Icon name="book" size={32} />
          </span>
        </m.div>
      </m.div>

      {flyBox && (
        <m.div
          className="intro-flyer intro-page"
          aria-hidden="true"
          style={{
            left: flyBox.left,
            top: flyBox.top,
            width: flyBox.width,
            height: flyBox.height,
            opacity: fOpacity,
            x: fx,
            y: fy,
            scaleX: fsx,
            scaleY: fsy,
            rotate: frot,
            skewX: fskew,
            clipPath: fclip,
            ["--lift" as string]: flift,
            ["--bind-tension" as string]: bindT,
          }}
        >
          <span className="intro-page__rules" />
          <span className="intro-page__binding" />
        </m.div>
      )}
    </m.div>
  );
}
