import { lazy, Suspense, useState } from "react";

/**
 * Decides whether the signature opening plays, and lazy-loads the scene so it
 * stays out of the main bundle.
 *
 * Lives directly under <Router> (not inside <Routes>), so it mounts once per
 * document and never remounts on navigation — its own `phase` state is what
 * stops it replaying on ordinary route changes. A full reload gives it a fresh
 * mount, so the opening plays again on reload / fresh entry, as intended.
 *
 * Reduced motion is NOT a skip: OpeningScene renders a static/near-static
 * version (see its `runStatic`).
 */

/** Never run inside Vitest — it would sit on top of every rendered test tree. */
const DISABLED = import.meta.env.MODE === "test";

const OpeningScene = lazy(() => import("./OpeningScene"));

export function OpeningGate() {
  const [done, setDone] = useState(DISABLED);
  if (done) return null;

  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "#050505",
          }}
        />
      }
    >
      <OpeningScene onDone={() => setDone(true)} />
    </Suspense>
  );
}
