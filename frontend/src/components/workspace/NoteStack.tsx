import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import type { Note } from "@shared/types";
import { Icon } from "@/components/ui";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NoteCard } from "./NoteCard";
import "./NoteStack.css";

interface NoteStackProps {
  notes: Note[];
  openId: string | null;
  onToggle: (id: string) => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  deletingId: string | null;
  /** Card kept invisible while a torn page is flying toward its slot. */
  hiddenId?: string | null;
  /** Card that just landed — settles into the pile instead of rising in. */
  arrivedId?: string | null;
}

// Deterministic pose per position in a column — a placed pile, not a shuffle.
const ROT = [-1, 0.8, -0.6, 1.1, -0.9, 0.5];
const TX = [-4, 5, -3, 4, -5, 3];

const ENTER_SPRING = { type: "spring", stiffness: 320, damping: 30, mass: 0.9 } as const;

/**
 * The clipboard — a horizontal pile of torn pages. Notes fill short columns
 * that cascade to the right; the board scrolls sideways as the pile grows so
 * the page never grows downward. Left sheets sit above right ones; upper
 * sheets in a column sit above lower ones.
 */
export function NoteStack({
  notes,
  openId,
  onToggle,
  onEdit,
  onDelete,
  deletingId,
  hiddenId,
  arrivedId,
}: NoteStackProps) {
  const reduce = useReducedMotion();
  const sideBySide = useMediaQuery("(min-width: 1200px)");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);

  // Tall columns beside the diary; shorter columns when the board is a strip.
  const colSize = !sideBySide ? 2 : notes.length <= 6 ? 2 : 3;
  const columns = useMemo(() => {
    const cols: Note[][] = [];
    notes.forEach((note, i) => {
      const c = Math.floor(i / colSize);
      (cols[c] ??= []).push(note);
    });
    return cols;
  }, [notes, colSize]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () =>
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [columns.length]);

  const scrollRight = () =>
    scrollRef.current?.scrollBy({ left: 320, behavior: reduce ? "auto" : "smooth" });

  return (
    <div className="note-stack" data-more={!atEnd || undefined}>
      <div className="note-stack__scroll" ref={scrollRef}>
        {columns.map((col, colIndex) => (
          <div
            className="note-stack__col"
            key={colIndex}
            style={{ "--col": String(colIndex) } as React.CSSProperties}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {col.map((note, idx) => {
                const suppressed = note._id === hiddenId;
                const arrived = note._id === arrivedId;
                const pos = idx;
                return (
                  <m.div
                    key={note._id}
                    layout={reduce ? false : "position"}
                    className="note-stack__slot"
                    style={
                      {
                        "--rot": `${ROT[pos % ROT.length]}deg`,
                        "--tx": `${TX[pos % TX.length]}px`,
                        "--z": String(200 - colIndex * 10 - idx),
                      } as React.CSSProperties
                    }
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.94 }}
                    animate={
                      suppressed ? { opacity: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1 }
                    }
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 8 }}
                    transition={
                      suppressed || arrived
                        ? { duration: 0 } // the flying sheet already did the motion — no swap flicker
                        : reduce
                          ? { duration: 0.15 }
                          : ENTER_SPRING
                    }
                  >
                    <NoteCard
                      note={note}
                      open={openId === note._id}
                      dimmed={Boolean(openId) && openId !== note._id}
                      onToggle={() => onToggle(note._id)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      deleting={deletingId === note._id}
                    />
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {!atEnd && (
        <button
          type="button"
          className="note-stack__more"
          aria-label="More notes — scroll right"
          onClick={scrollRight}
        >
          <Icon name="arrow-right" size={18} />
        </button>
      )}
    </div>
  );
}
