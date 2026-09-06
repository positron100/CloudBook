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
  { x: 4, y: 2, z: -2, rotateZ: -0.8 },
  { x: 8, y: 4, z: -4, rotateZ: 0.7 },
  { x: 12, y: 6, z: -6, rotateZ: -0.5 },
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
  const coverRot = useMotionValue(-2);
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
  // The flyer's *paper* opacity — dissolves onto the real destination surface
  // in the last part of the flight so the page becomes the UI with no swap.
  const fPaper = useMotionValue(1);

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

      // Reference (a signing loop): every move has anticipation, the visible
      // result trails the physical driver, and there is one continuous motion
      // — no reset between beats, no blank frame at the end. ~1.6s total.

      // 1 — REST. The journal lands closed with a small settle and holds still.
      animate(bookFade, 1, { duration: TS * 0.12 });
      await Promise.all([
        animate(bookScale, [0.92, 1.01, 1], {
          duration: TS * 0.32,
          times: [0, 0.72, 1],
          ease: ease.entrance,
        }),
        animate(bookY, [8, -5, -4], { duration: TS * 0.32, times: [0, 0.72, 1], ease: ease.entrance }),
      ]);
      if (cancelled) return;
      await nap(70);

      // 2 — OPEN. The cover swings away; the pages become visible as a result.
      await animate(coverRot, -160, { duration: TS * 0.32, ease: ease.entrance });
      if (cancelled) return;

      // 3 — FLIP · settle ×3. Each sheet turns from the binding, drops flat
      //     with a tiny settle, then rests briefly — three distinct sheets.
      const flip = async (mv: typeof pf0, deg: number) => {
        await animate(mv, deg, { duration: TS * 0.17, ease: [0.4, 0, 0.3, 1] });
        await animate(mv, deg + 2.5, { duration: TS * 0.07, ease: "easeOut" });
        await nap(42);
      };
      await flip(pf0, -168);
      if (cancelled) return;
      await flip(pf1, -175);
      if (cancelled) return;
      await flip(pf2, -170);
      if (cancelled) return;

      // 4 — SELECT. The chosen page rises (past, then settles), catches light.
      await animate(chosenLift, [0, 1.1, 1], {
        duration: TS * 0.18,
        times: [0, 0.7, 1],
        ease: "easeOut",
      });
      animate(chosenGlow, 1, { duration: TS * 0.16 });
      if (cancelled) return;
      await nap(90);

      // hand the chosen page to the flyer — same paper, same place, same frame
      fOpacity.set(1);

      // 5 — TENSION. Pull against the binding; the holes stretch.
      await Promise.all([
        animate(fy, 4, { duration: TS * 0.08, ease: "easeOut" }),
        animate(fsy, 1.02, { duration: TS * 0.08, ease: "easeOut" }),
        animate(fskew, -1.4, { duration: TS * 0.08, ease: "easeOut" }),
        animate(fclip, EDGE_NICK, { duration: TS * 0.08 }),
        animate(bindT, 1, { duration: TS * 0.09 }),
        animate(flift, 0.35, { duration: TS * 0.08 }),
      ]);
      if (cancelled) return;

      // 6 — RELEASE. The rip runs across while the page is already lifting.
      animate(fclip, [EDGE_NICK, EDGE_HALF, EDGE_TORN], {
        duration: TS * 0.1,
        times: [0, 0.55, 1],
        ease: [0.3, 0, 0.4, 1],
      });
      animate(fsy, 1, { duration: TS * 0.1, ease: "easeOut" });
      animate(fy, -14, { duration: TS * 0.13, ease: [0.4, 0, 0.68, 1] });
      animate(frot, -2.6, { duration: TS * 0.13, ease: [0.4, 0, 0.68, 1] });
      animate(flift, 1, { duration: TS * 0.13, ease: "easeOut" });
      await nap(60);
      if (cancelled) return;

      // 7 — FLIGHT + BECOME. One continuous move: the page carries to the
      //     destination rect and, in its last third, its paper dissolves onto
      //     the real destination surface (already rendered underneath) while
      //     the reveal — starting already over the destination — grows out.
      //     There is never a frame with no destination visible.
      const D = 0.44 * TS;
      const yFrom = fy.get();
      const maxR = Math.hypot(vw, vh) * 1.05;
      animate(fskew, [fskew.get(), 0.4, 0], { duration: D, ease: "easeInOut" });
      animate(flift, [1, 0.4, 0], { duration: D, ease: "easeInOut" });
      animate(bindT, 0, { duration: D * 0.55, ease: "easeOut" });
      animate(fclip, [EDGE_TORN, EDGE_SETTLE, EDGE_FLAT], {
        duration: D * 0.7,
        times: [0, 0.45, 1],
        ease: "easeOut",
      });

      // the reveal opens over the destination, and the flyer's paper dissolves
      // onto it, both starting ~58% through the flight
      revealR.set((Math.hypot(t.width, t.height) / 2) * 1.14);
      window.setTimeout(() => {
        if (cancelled) return;
        setRevealing(true);
        animate(fPaper, 0, { duration: D * 0.36, ease: "easeIn" });
      }, D * 580);

      await Promise.all([
        animate(fx, dx, { duration: D, ease: [0.22, 0.55, 0.3, 1] }),
        animate(fy, [yFrom, dy - 18, dy], {
          duration: D,
          times: [0, 0.52, 1],
          ease: ["easeOut", "easeInOut"],
        }),
        animate(frot, [frot.get(), 1, 0.2, 0], {
          duration: D,
          times: [0, 0.42, 0.78, 1],
          ease: "easeInOut",
        }),
        animate(fsx, [1, 1, lerp(1, sX, 0.74), sX], {
          duration: D,
          times: [0, 0.2, 0.72, 1],
          ease: [0.3, 0, 0.3, 1],
        }),
        animate(fsy, [1, 1, lerp(1, sY, 0.74), sY], {
          duration: D,
          times: [0, 0.2, 0.72, 1],
          ease: [0.3, 0, 0.3, 1],
        }),
      ]);
      if (cancelled) return;

      // 8 — REVEAL OUT. The destination is established where the page landed;
      //     the circle grows past it to the desk, then the nav at the edges.
      fPaper.set(0);
      await nap(60);
      await animate(revealR, maxR, { duration: TS * 0.42, ease: [0.6, 0, 0.35, 1] });
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
    <>
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
      </m.div>

      {/* The flyer sits ABOVE the scene, so the scene's reveal mask never clips
          it. Its paper (`.intro-flyer__sheet`) dissolves onto the real
          destination surface as it lands. */}
      {flyBox && (
        <m.div
          className="intro-flyer"
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
          }}
        >
          <m.div
            className="intro-flyer__sheet intro-page"
            style={{
              opacity: fPaper,
              ["--lift" as string]: flift,
              ["--bind-tension" as string]: bindT,
            }}
          >
            <span className="intro-page__rules" />
            <span className="intro-page__binding" />
          </m.div>
        </m.div>
      )}
    </>
  );
}
