import { useState } from "react";
import { Reveal, Stagger, Pressable, Magnetic, FadePresence } from "@/components/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTheme } from "@/context/ThemeContext";
import { up } from "@/utils/breakpoints";

const ELEV = ["--elev-1", "--elev-2", "--elev-3", "--elev-4"] as const;

/**
 * Dev-only harness (`/kitchen-sink`) for the P1.x design system + motion
 * primitives. Not part of the product; not shipped in production builds.
 */
export default function KitchenSink() {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery(up("lg"));
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<"a" | "b">("a");

  return (
    <div style={{ padding: "var(--space-6) 0", maxWidth: 900 }}>
      <Reveal as="section" onView={false}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-h1)" }}>
          Kitchen sink
        </h1>
        <p style={{ color: "var(--fg-muted)" }}>
          reduced-motion: <strong>{String(reduceMotion)}</strong> · desktop (≥lg):{" "}
          <strong>{String(isDesktop)}</strong> · theme: <strong>{theme}</strong>
        </p>
      </Reveal>

      <section style={{ marginTop: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-h3)" }}>Elevation</h2>
        <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap", marginTop: "var(--space-4)" }}>
          {ELEV.map((tok) => (
            <div
              key={tok}
              style={{
                width: 140,
                height: 90,
                background: "var(--sheet)",
                borderRadius: "var(--radius-md)",
                boxShadow: `var(${tok})`,
                display: "grid",
                placeItems: "center",
                color: "var(--fg-faint)",
                fontSize: "var(--text-meta)",
              }}
            >
              {tok}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-h3)" }}>Stagger + Reveal</h2>
        <Stagger as="ul" onView={false} style={{ listStyle: "none", padding: 0, marginTop: "var(--space-4)" }}>
          {["Capture a thought", "Find it later", "Keep it on the desk"].map((t) => (
            <Stagger.Item key={t} as="li" style={{ padding: "var(--space-3) 0", color: "var(--fg)" }}>
              {t}
            </Stagger.Item>
          ))}
        </Stagger>
      </section>

      <section style={{ marginTop: "var(--space-6)", display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
        <h2 style={{ fontSize: "var(--text-h3)", margin: 0 }}>Press / Magnetic</h2>
        <Pressable
          className="btn btn-primary"
          lift
          onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
        >
          Toggle theme (reveal from here)
        </Pressable>
        <Magnetic>
          <span
            style={{
              display: "inline-block",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-pill)",
              background: "var(--accent-soft)",
              color: "var(--accent-strong)",
            }}
          >
            magnetic
          </span>
        </Magnetic>
      </section>

      <section style={{ marginTop: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-h3)" }}>FadePresence</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => setView((v) => (v === "a" ? "b" : "a"))}>
          swap view
        </button>
        <FadePresence transitionKey={view}>
          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-5)",
              background: "var(--sheet)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--elev-2)",
            }}
          >
            View {view.toUpperCase()}
          </div>
        </FadePresence>
      </section>
    </div>
  );
}
