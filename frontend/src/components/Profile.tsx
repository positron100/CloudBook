import { useMemo, useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import { cn } from "@/utils/cn";
import { pageTurn, duration, ease } from "@/utils/motion";
import { useAuth } from "@/context/AuthContext";
import { useNotes } from "@/context/NotesContext";
import { useRouteTransition } from "@/components/transitions/RouteTransition";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { deriveTags } from "@/lib/notesQuery";
import { formatRelativeDate } from "@/utils/date";
import "./Profile.css";

/** First-and-last initial from the real name; falls back gracefully. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function joinedLabel(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/** Compact form for the side page's stats — "September 2026". */
function monthYear(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

const TURN = { duration: pageTurn.durationMs / 1000, ease: pageTurn.ease };

/**
 * Profile as two objects on the same desk: a physical CloudBook notebook
 * (closed: a cover with the user's initials; open: their core identity —
 * name, id, joined, note count, nothing else) and, to its right, a loose
 * profile information page — richer notebook stats and recent thoughts. The
 * notebook is the anchor and never moves or resizes for the page's sake; the
 * page is positioned relative to it and settles in shortly after the physical
 * turn finishes, never competing with it.
 */
export default function Profile() {
  const { user, status } = useAuth();
  const { notes } = useNotes();
  const { transitionTo } = useRouteTransition();
  const wide = useMediaQuery("(min-width: 641px)");
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const coverRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const loading = status === "loading";
  const ready = !loading && !!user;
  const canTurn = wide && !reduce;

  const tagCount = useMemo(() => deriveTags(notes).length, [notes]);
  const recent = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
    [notes],
  );
  const lastActivity = recent[0] ? formatRelativeDate(recent[0].date) : "—";

  // Move focus with the turn so the keyboard follows the page.
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
    else if (document.activeElement === closeRef.current)
      coverRef.current?.focus({ preventScroll: true });
  }, [open]);

  const coverAnim = !user
    ? { rotateY: 0, y: "0%", x: "0%", opacity: 1 }
    : reduce
      ? { rotateY: 0, y: "0%", x: "0%", opacity: open ? 0 : 1 }
      : canTurn
        ? { rotateY: open ? -172 : 0, y: "0%", x: "0%", opacity: 1 }
        : { rotateY: 0, y: open ? "-101%" : "0%", x: "0%", rotate: open ? -1.4 : 0, opacity: open ? 0 : 1 };

  // On the desktop turn the whole notebook slides toward the reader as it opens,
  // so the page ends up centred and the flat cover lies to its left in frame.
  const bookAnim = canTurn ? { x: open ? "-30%" : "0%" } : { x: "0%" };

  // Recent Thoughts → Home, via the same page-turn every section navigation
  // uses (no bespoke transition). Home reads `openNoteId` off location state:
  // it mounts immediately underneath the turning leaf, so by the time the
  // ~1s fold finishes it has had the whole turn to settle — then it briefly
  // highlights this note and runs the exact same card-to-editor unfold every
  // other entry point uses. A direct DOM write (not React state — the
  // component is about to unmount as the route changes) marks the clicked
  // row as selected *before* the leaf's snapshot is taken, so the "this is
  // the one I picked" moment rides along into the fold itself.
  const openThought = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.add("profile-side__recent-item--selected");
    transitionTo("/", { openNoteId: id });
  };
  const goToDesk = () => transitionTo("/");

  return (
    <section className="profile" aria-label="Your CloudBook">
      <div className="profile-desk">
        <m.div
          className={cn("profile-book", open && "is-open", reduce && "is-reduced")}
          initial={false}
          animate={bookAnim}
          transition={reduce ? { duration: 0 } : TURN}
        >
          {/* INSIDE — the page, always mounted; revealed as the cover turns.
              Deliberately simple: the notebook is the physical identity
              object, not the place for the richer stats — those live on the
              separate page to its right. */}
          <div className="profile-book__inside" aria-hidden={!open || undefined}>
            <span
              className="profile-book__rings ring-binding ring-binding--vertical"
              aria-hidden="true"
            >
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className="ring-binding__ring" />
              ))}
            </span>

            <div className="profile-book__page">
              {loading && <p className="profile-book__muted">Opening your notebook…</p>}
              {!loading && !user && (
                <p className="profile-book__muted">Could not open your notebook.</p>
              )}

              {user && (
                <>
                  <p className="profile-book__eyebrow">CloudBook</p>
                  <div className="profile-book__identity">
                    <span className="profile-book__badge" aria-hidden="true">
                      {initialsOf(user.name)}
                    </span>
                    <h1 className="profile-book__name">{user.name}</h1>
                  </div>
                  <span className="profile-book__rule" aria-hidden="true" />

                  <dl className="profile-book__facts">
                    <div>
                      <dt>User ID</dt>
                      <dd className="profile-book__mono">{user._id}</dd>
                    </div>
                    <div>
                      <dt>Joined</dt>
                      <dd>{joinedLabel(user.date)}</dd>
                    </div>
                  </dl>

                  <p className="profile-book__count">
                    <span className="profile-book__count-num">{notes.length}</span>
                    <span className="profile-book__count-label">
                      {notes.length === 1 ? "note on the desk" : "notes on the desk"}
                    </span>
                  </p>

                  <button
                    type="button"
                    ref={closeRef}
                    className="profile-book__close"
                    onClick={() => setOpen(false)}
                  >
                    Close notebook
                  </button>
                </>
              )}
            </div>
          </div>

          {/* COVER — the turning leaf */}
          <m.button
            type="button"
            ref={coverRef}
            className="profile-book__cover"
            onClick={() => user && setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close notebook" : "Open notebook"}
            disabled={!user && !loading}
            initial={false}
            animate={coverAnim}
            transition={reduce ? { duration: 0 } : TURN}
          >
            <span className="profile-book__face">
              <span className="profile-book__brand">CloudBook</span>
              <span className="profile-book__band" aria-hidden="true" />
              <span className="profile-book__initials">
                {loading ? "·" : ready ? initialsOf(user!.name) : "?"}
              </span>
              <span className="profile-book__hint">{ready ? "Open" : ""}</span>
            </span>
            <span className="profile-book__back" aria-hidden="true" />
            <m.span
              className="profile-book__shade"
              aria-hidden="true"
              initial={false}
              animate={{ opacity: canTurn && open ? [0, 0.55, 0] : 0 }}
              transition={reduce ? { duration: 0 } : { ...TURN, times: [0, 0.5, 1] }}
            />
          </m.button>
        </m.div>

        {/* THE RIGHT PAGE — a second, loose sheet lying beside the notebook on
            the same desk. Never affects the notebook's own position: it is
            absolutely positioned off the notebook's own (untransformed) box,
            so its presence/size can never shift where the notebook sits. It
            settles in shortly after the physical turn finishes — a quiet
            fade + short slide, not a competing animation. */}
        {user && (
          <m.aside
            className="profile-side"
            aria-hidden={!open || undefined}
            aria-label="Profile information"
            initial={false}
            animate={
              reduce
                ? { opacity: open ? 1 : 0 }
                : { opacity: open ? 1 : 0, x: open ? 0 : 14 }
            }
            transition={
              reduce
                ? { duration: 0 }
                : { duration: duration.base, ease: ease.entrance, delay: open ? TURN.duration + 0.08 : 0 }
            }
          >
            <p className="profile-side__eyebrow">Profile</p>
            <h2 className="profile-side__title">Your notebook</h2>

            <p className="profile-side__section-label">About your notebook</p>
            <dl className="profile-side__stats">
              <div>
                <dt>Joined</dt>
                <dd>{monthYear(user.date)}</dd>
              </div>
              <div>
                <dt>Total notes</dt>
                <dd>{notes.length}</dd>
              </div>
              <div>
                <dt>Total tags</dt>
                <dd>{tagCount}</dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>{lastActivity}</dd>
              </div>
            </dl>

            <p className="profile-side__section-label">Recent thoughts</p>
            {recent.length > 0 ? (
              <ul className="profile-side__recent">
                {recent.map((note) => (
                  <li key={note._id}>
                    <button
                      type="button"
                      className="profile-side__recent-item"
                      onClick={(e) => openThought(note._id, e)}
                    >
                      <span className="profile-side__recent-title">{note.title}</span>
                      <span className="profile-side__recent-time">
                        {formatRelativeDate(note.date)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-side__empty">
                No thoughts captured yet.{" "}
                <button type="button" className="profile-side__link" onClick={goToDesk}>
                  Write the first one
                </button>
              </p>
            )}
          </m.aside>
        )}
      </div>
    </section>
  );
}
