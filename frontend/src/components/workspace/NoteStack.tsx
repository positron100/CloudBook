import { useMemo } from "react";
import { AnimatePresence, m } from "framer-motion";
import type { Note } from "@shared/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { up } from "@/utils/breakpoints";
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
const ROT = [-0.7, 0.55, -0.4, 0.8, -0.55];
const TX = [-3, 4, -2, 3, -4];

const ENTER_SPRING = { type: "spring", stiffness: 320, damping: 30, mass: 0.9 } as const;
const SETTLE_SPRING = { type: "spring", stiffness: 260, damping: 26, mass: 0.8 } as const;

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
  const md = useMediaQuery(up("md"));
  const lg = useMediaQuery(up("lg"));
  const xl = useMediaQuery(up("xl"));
  const colCount = xl ? 4 : lg ? 3 : md ? 2 : 1;

  const columns = useMemo(() => {
    const cols: Note[][] = Array.from({ length: colCount }, () => []);
    notes.forEach((note, i) => cols[i % colCount].push(note));
    return cols;
  }, [notes, colCount]);

  return (
    <div className="note-stack" data-cols={colCount}>
      {columns.map((col, colIndex) => (
        <div className="note-stack__col" key={colIndex}>
          <AnimatePresence initial={false} mode="popLayout">
            {col.map((note, idx) => {
              const suppressed = note._id === hiddenId;
              const arrived = note._id === arrivedId;
              return (
                <m.div
                  key={note._id}
                  layout={reduce ? false : "position"}
                  className="note-stack__slot"
                  style={
                    {
                      "--rot": `${ROT[idx % ROT.length]}deg`,
                      "--tx": `${TX[idx % TX.length]}px`,
                      "--z": String(col.length - idx),
                    } as React.CSSProperties
                  }
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.94 }}
                  animate={
                    suppressed
                      ? { opacity: 0, scale: 0.96 }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 8 }}
                  transition={
                    suppressed
                      ? { duration: 0 }
                      : reduce
                        ? { duration: 0.15 }
                        : arrived
                          ? SETTLE_SPRING
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
  );
}
