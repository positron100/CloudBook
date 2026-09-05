import { useState } from "react";
import { Reveal, Stagger, Magnetic, FadePresence } from "@/components/motion";
import { Button, Card, Chip, Field, IconButton, Skeleton } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { up } from "@/utils/breakpoints";

const ELEV = ["--elev-1", "--elev-2", "--elev-3", "--elev-4"] as const;

/**
 * Dev-only harness (`/kitchen-sink`) for the design system + motion primitives.
 * Not part of the product; not shipped in production builds.
 */
export default function KitchenSink() {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery(up("lg"));
  const { theme } = useTheme();
  const toast = useToast();
  const [view, setView] = useState<"a" | "b">("a");

  return (
    <div style={{ padding: "var(--space-6) 0", maxWidth: 900, display: "grid", gap: "var(--space-7)" }}>
      <Reveal as="section" onView={false}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-h1)", margin: 0 }}>
          Kitchen sink
        </h1>
        <p style={{ color: "var(--fg-muted)" }}>
          reduced-motion: <strong>{String(reduceMotion)}</strong> · desktop (≥lg):{" "}
          <strong>{String(isDesktop)}</strong> · theme: <strong>{theme}</strong>
        </p>
      </Reveal>

      <section>
        <h2 style={{ fontSize: "var(--text-h3)" }}>Buttons</h2>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <IconButton icon="plus" label="Add" variant="solid" />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-h3)" }}>Toasts</h2>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Button size="sm" onClick={() => toast.success("Saved")}>
            success
          </Button>
          <Button size="sm" onClick={() => toast.error("Something went wrong")}>
            error
          </Button>
          <Button size="sm" onClick={() => toast.info("Heads up")}>
            info
          </Button>
          <Button size="sm" onClick={() => toast.warning("Careful")}>
            warning
          </Button>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-h3)" }}>Field</h2>
        <div style={{ maxWidth: 360, display: "grid", gap: "var(--space-4)" }}>
          <Field label="Title" placeholder="Untitled" />
          <Field label="Password" type="password" error="Passwords don't match" />
          <Field as="textarea" label="Description" placeholder="Write…" />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-h3)" }}>Elevation + Card</h2>
        <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          {ELEV.map((tok) => (
            <div
              key={tok}
              style={{
                width: 130,
                height: 84,
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
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <Card interactive style={{ width: 200, padding: "var(--space-4)" }}>
            <strong>Interactive card</strong>
            <p style={{ color: "var(--fg-muted)", fontSize: "var(--text-label)" }}>hover me</p>
            <Chip tone="accent">General</Chip>
          </Card>
          <Card selected style={{ width: 200, padding: "var(--space-4)" }}>
            <strong>Selected card</strong>
          </Card>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-h3)" }}>Stagger · Magnetic · Skeleton</h2>
        <Stagger as="ul" onView={false} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {["Capture a thought", "Find it later", "Keep it on the desk"].map((t) => (
            <Stagger.Item key={t} as="li" style={{ padding: "var(--space-2) 0" }}>
              {t}
            </Stagger.Item>
          ))}
        </Stagger>
        <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
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
          <div style={{ flex: 1, display: "grid", gap: "var(--space-2)" }}>
            <Skeleton width="60%" />
            <Skeleton />
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "var(--text-h3)" }}>FadePresence</h2>
        <Button size="sm" onClick={() => setView((v) => (v === "a" ? "b" : "a"))}>
          swap view
        </Button>
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
