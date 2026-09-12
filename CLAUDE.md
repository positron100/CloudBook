# CloudBook — Project Handoff (`CLAUDE.md`)

> **Read this first.** It is the living state of the frontend redesign. Treat
> **§0 (Latest Checkpoint)** as the truth about where work stopped — it
> supersedes the opening-animation-era sections (§1–§12) below wherever they
> conflict; those sections are kept as historical record of that earlier
> phase, same as this file already does for the openings before *that*.
> Inspect the referenced files before changing anything. Do not redo completed
> work. Update this file whenever significant progress is made.

Last updated: session ending at working tree on branch `p0-foundation` —
**ambient flying-block field + shared frosted-glass system** built, tuned
across several passes, and stability-checkpointed (§0). The opening-animation
work in §1–§12 below is an **earlier phase of the same session**, still
accurate for the opening itself, but no longer the active objective.
**Not yet committed** (same uncommitted tree as before — nothing here has
been committed this session).

Status legend used below: **[Verified]** = read/ran and confirmed · **[Partial]** =
built but not fully verified · **[Planned]** = not started · **[Assumed]** = believed
true, not re-checked this session.

---

## 0. Latest Checkpoint — Ambient Glass System (read this first)

**Frozen baseline.** The visual/interaction system below is approved and
stable. Do not redesign it; only fix a demonstrated regression. This section
is the developer-facing snapshot requested at the end of that work.

### 0.1 Approved visual architecture

CloudBook's material world now has three deliberate layers, in this order
(back to front):

1. **Background** — `DeskBackdrop` (`src/components/layout/DeskBackdrop.tsx`
   `.css`), `position: fixed`, `z-index: var(--z-base)`. Two soft warm blooms
   (`::before`/`::after`) plus the ambient cube field (§0.4).
2. **Physical paper** — the notebook, note cards, the editor's writing
   surface, the Profile book/side page, the ContactLetter — fully opaque,
   never glass. This is the load-bearing distinction of the whole system; see
   §0.3.
3. **Glass UI** — floating navigation and controls, translucent, blurred,
   sheened, sitting visually *in front of* the moving cube field. See §0.3.

Identity stays **"the Lit Desk"**: warm paper, graphite, blue-violet accent,
one upper-left key light (`--key-light`) that every shadow, highlight and
sheen in the system points from — glass and physical surfaces read as
objects in the *same* lit room, not two unrelated design languages.

### 0.2 Approved motion architecture

No new animation system was introduced for any of this — everything reuses
what already existed:

- **CSS `@keyframes`** for the one continuous, always-running animation (the
  cube rise — see §0.4). Runs independently of React; never restarted by
  state changes.
- **Framer Motion** (`m.*`, already under `<LazyMotion features={domMax}
  strict>`) for anything state-driven: the cube typing-reposition spring, the
  existing `NoteStack` `layoutId` reflow, `TearSheet`/`ReturnSheet`,
  `NoteEditor` `foldAway`, `RouteTransition`'s page-turn — all pre-existing,
  untouched.
- **Plain CSS `transition`** for glass material states (hover/focus/pressed),
  all on `var(--dur-fast)` (240ms) except dropdown panels' heavier blur swap.
- **No `requestAnimationFrame` loop was added.** The cube field costs zero JS
  per frame; typing reposition is a single framer spring per cube, coalesced
  (see §0.5).

### 0.3 Glass / material hierarchy

Tokens live in `src/styles/tokens.css` under the `--glass-*` block, applied
directly (most components) or via `.glass-primary/secondary/subtle` utility
classes (`src/styles/glass.css`, for new surfaces only).

| Tier | Alpha (of `--float`) | Used by | Role |
|---|---|---|---|
| **primary** | 42% (hover 50%, pressed 56%) | `TopNav`, `SearchPill` (both states), `BottomNav` (own alpha 48%, see below) | Large, important floating surfaces — lowest opacity, cube field should read clearly through them |
| **secondary** | 66% (hover 74%, pressed 78%) | `TagMenu`/`SortMenu` trigger + panel, `TagSelect` panel, `ContactReach` | Interactive controls/utilities and their dropdowns — translucent enough to show motion, opaque enough to stay legible |
| **subtle** | 82% (hover 88%, pressed 90%) | `TagSelect` trigger, `Profile` recent-note item | Small, text-dense secondary surfaces — transparency is *meant* to be barely perceptible; this is the **least** glassy tier, not the most |

Shared recipe every tier composes from: `--glass-blur` (13px, or
`-heavy` 24px for dropdown panels, or `-soft` 8px for subtle), `--glass-sheen`
(a soft diagonal upper-left highlight, `background: var(--glass-sheen),
var(--glass-bg-*)` — always layered, never alone), `--glass-border` /
`-hover` / `-pressed`, `--glass-highlight` (an inset top-edge catch) /
`-hover` / `-pressed`.

`BottomNav`'s pill deliberately keeps its **own** background alpha (48%, not
the shared `--glass-bg-primary`) — its 0.6875rem labels over a busy
background needed more of a legibility margin than the tier default gives;
everything else (sheen, blur, border, highlight, hover/pressed) is shared.
This is the one intentional per-surface override — do not "fix" it into
using the raw primary tier.

**Physical vs. glass boundary (do not cross):** `NoteCard`, `NoteEditor`'s
page, `Profile`'s book/side page, `ContactLetter`'s paper are **opaque**, no
`--glass-*` token anywhere in those files. Grep `glass` across component CSS
— it should only ever appear in the 9 surfaces named in the table above.

### 0.4 Ambient block field (`AmbientCubeField.tsx` / `.css`)

Mounted inside `DeskBackdrop`. Modelled on Compile Palace's **actual runtime**
CSS (`index.css`'s `@keyframes float` — the live one; `App.css`'s bob
keyframe of the same name is dead, unimported code and was the source of an
earlier, incorrect read of that project). 16 cubes desktop / 8 mobile
(`nth-child(n+9){display:none}` under 768px, pure CSS).

Three nested layers per cube, each owning exactly one kind of motion so they
never fight:

1. **`.ambient-cubes__slot`** — framer spring, typing-driven `left`%/`y`vh
   target. Never touches the rise.
2. **`.ambient-cubes__parallax`** — pointer drift, plain CSS var read off a
   direct DOM write (no React state per move), gated `(pointer: fine)` +
   `!reduce`.
3. **`.ambient-cubes__cube`** — the continuous rise: `@keyframes cube-rise`,
   `linear infinite`, spawn (invisible) → fade in → rise the full viewport
   height (`translateY(-100vh)`, fixed regardless of spawn `top` — some cubes
   travel farther than others, which is *why* the field reads as a
   continuous stream, not a synchronized wave) → rotate once (signed,
   direction varies per cube) → morph `border-radius` 4px → 50% (square →
   circle) → fade out → loop. A per-cube **negative** `animation-delay`
   starts every cube mid-cycle so the field is already staggered on frame 1.

### 0.5 Typing reaction (`useTypingSignal.ts`)

Scoped, not global: only `.diary__title`, `.diary__body`, `.written-line__input`
(note title/body, contact letter) and `.search-pill__input` fire the signal.
Login/register/password fields are not in the allow-list — they get *zero*
reaction, not a smaller one. A `document`-level `input` listener, 260ms
debounce/coalesce (5 keystrokes in a burst → exactly 1 recomposition,
console-verified). On commit, `seed` increments; each cube's target
`left`/`y` is a deterministic `mulberry32`-style function of `(seed,
cubeIndex)` — same seed always gives the same layout, no accumulated random
walk. The spring **only moves the slot** (§0.4 layer 1); the cube's own
`cube-rise` keyframe is structurally untouched by any of this — verified live
that `animation-delay`/`animation-duration`/`animationPlayState` are
byte-identical before and after a typing burst.

### 0.6 Note lifecycle (untouched, reconfirmed)

`TearSheet` (create), `ReturnSheet` (delete), `NoteEditor.foldAway`
(open/close), `NoteStack`'s `LayoutGroup` + per-card `layoutId` reflow (so
search/tag/sort filtering *moves* cards into place instead of swapping
lists), and the ring-binding trace — all pre-date this session's glass work
and were not modified by it. Live-reconfirmed this session: create and
delete both settle cleanly with no duplicate/stuck DOM (delete's physical
return animation genuinely takes >900ms — that's the design, not a bug).

### 0.7 Navigation (untouched, reconfirmed)

Page-fold `RouteTransition`, `useDragTurn`, `NavIndicator`, mobile
`BottomNav`'s floating/detached/draggable pill, its init-measurement fix —
none of this was touched by the glass passes. `TagMenu`/`SortMenu` panels
sit at `z-index: 30`, deliberately below `BottomNav`'s `--z-nav: 40` — nav
must always be able to out-rank a popup it didn't expect to be nested in.
Verified repeatedly this session: `Tag` trigger's `x` position is identical
before/after `SearchPill` opens (no reflow), `BottomNav` stays `opacity: 1`
with a popup open.

### 0.8 Responsive

Verified at 360/375/390/430/768/1024/1280+, both themes: no horizontal
overflow, mobile cube count correctly halves at the 768px breakpoint, glass
controls stay readable and non-clipping, `SearchPill`/`TagMenu`/`SortMenu`
stay anchored right with no reflow when search expands.

### 0.9 Accessibility / reduced motion

Global `:focus-visible` default (`global.css`) is never overridden with
`outline: none` anywhere in the glass work. Every interactive glass control's
`:hover` rule is paired with `:focus-visible` (material response is
additive to the ring, never a replacement for it) — this was the one real
gap found and fixed (`TopNav`'s icon-btn, see §0.10). `-webkit-tap-highlight-
color: transparent` (pre-existing, `global.css`) confirmed still suppressing
the old mobile blue-flash artifact at 360/390/430.

Reduced motion (`global.css`'s existing `prefers-reduced-motion: reduce`
backstop, which collapses all transitions to `0.01ms` — nothing glass-
specific was added): cube idle rise stops and parks at a static visible
opacity/radius (not frozen at an invisible keyframe edge); pointer parallax
listener never attaches; typing reposition still moves the slot, just
without the spring. Glass `background-color`/`backdrop-filter`/`border-color`
are byte-identical normal vs. reduced — confirmed live. Material is never
stripped under reduced motion, only animation.

### 0.10 Verification status (last run, this checkpoint)

`tsc -b` clean · `eslint` 0 errors / 6 known `react-refresh` warnings
(pre-existing, context files) · `vitest` 71 passed / 14 files · `vite build`
clean, main `index.js` ≈ 227.3 KB / **73.79 KB gz**. Playwright: rest→hover→
pressed→release material cycle (computed-style + `.matches()` + screenshot
cross-check — this harness occasionally returns a stale `getComputedStyle`
read after a synthetic CDP mouse/focus event; when that happened it was
resolved by a forced reflow or a screenshot, never by changing CSS), keyboard
Tab sweep (accent ring at every stop), touch tap at 360/390/430 (no blue
flash, no stuck `:active`), search expand (38px → 234px), full responsive
sweep both themes, reduced-motion parity, create/delete note lifecycle.

### 0.11 Explicit "do not regress" list

- Glass alpha tiers, sheen, hover/pressed token values (§0.3) — frozen.
- Cube count (16/8), spawn/rise/rotate/morph/loop mechanics, negative-delay
  staggering (§0.4) — frozen.
- Typing signal's allow-list, 260ms debounce, seed→target function (§0.5) —
  frozen.
- `SearchPill` choreography, `Tag`/`Sort` right-anchoring, popup
  `z-index: 30` vs. nav `z-index: 40` (§0.7) — frozen.
- Physical-vs-glass boundary (§0.3) — no `--glass-*` token may appear on
  `NoteCard`, `NoteEditor`'s page, `Profile`'s book/side page, or
  `ContactLetter`'s paper.
- Everything in §0.6/§0.7 (note lifecycle, navigation) — pre-existing,
  reconfirmed working, not part of this work and not to be refactored
  incidentally while touching glass/ambient code nearby.

### 0.12 Files touched across the glass/ambient work

`src/styles/tokens.css` (the `--glass-*` block), `src/styles/glass.css` (new),
`src/hooks/useTypingSignal.ts` (new), `src/components/layout/AmbientCubeField.tsx`
+ `.css` (new), `src/components/layout/DeskBackdrop.tsx` (mounts the field),
`src/components/layout/TopNav.css`, `src/components/layout/BottomNav.css`,
`src/components/workspace/SearchPill.css`, `TagMenu.css`, `SortMenu.css`,
`TagSelect.css`, `src/components/contact/ContactLetter.css`,
`src/components/Profile.css`. `src/main.tsx` gained one import
(`styles/glass.css`). Nothing outside these files, and nothing in
`backend/`, was touched.

---

## 1. Project Context

**What it is.** CloudBook is a MERN note-taking app. This repo is a monorepo with
two npm workspaces:

- `frontend/` — Vite 5 + React 18.3 + TypeScript 5.5 SPA. **Deploys to Vercel.**
  This is where all active work happens.
- `backend/` — Express + Mongoose API. **Deploys to Render.** Live at
  `https://cloud-book-backend.onrender.com` (see `frontend` `VITE_API_URL`).
  **Not touched this redesign — do not change it.**
- `shared/types/index.ts` — the frontend↔backend contract (entities + response
  shapes + `API_ROUTES`). Backend responses are deliberately inconsistent
  between endpoints; that is documented in this file, not fixed.

**The redesign.** A long-running frontend rebuild into a *"premium, dimensional,
calm digital writing desk"* — internally **"The Lit Desk"**. Warm paper, graphite,
blue-violet accent, restrained physical depth, liquid-glass controls, Poppins
type. Every note/letter/page is treated as a **physical sheet of paper** that
moves as one continuous object between states (never a fade / component swap).

**Frontend architecture / key tech:**

- **Routing:** `react-router-dom` v6. Routes in `src/App.tsx`. `/` (Home/Notes,
  auth-gated) · `/about` (About + Contact) · `/login` `/register` (AuthPage, one
  mounted instance across both) · `/signup` → redirect · `/profile` (auth-gated)
  · dev-only `/kitchen-sink`, `/workspace-preview`.
- **Animation:** `framer-motion` v11.18.2 under `<LazyMotion features={domMax}
  strict>` (in `App.tsx`). **`strict` means only `m.*` components, never
  `motion.*` and never `m(Component)`.** Motion vocabulary lives in
  `src/utils/motion.ts` (`duration`, `ease`, `spring`, `reveal`, `authCurtain`).
  CSS motion tokens mirror it in `src/styles/tokens.css`.
- **State:** React context — `AuthContext`, `NotesContext` (optimistic),
  `ThemeContext`, `ToastContext`. No Redux/Zustand.
- **Styling:** hand-written CSS per component (`Foo.tsx` + `Foo.css`), design
  tokens in `src/styles/tokens.css`, base/reset + reduced-motion + circular
  theme-reveal CSS in `src/styles/global.css`. No CSS framework (Bootstrap was
  removed).
- **API client:** `src/lib/apiClient.ts` (`apiRequest`) + `src/lib/api.ts`
  (typed wrappers). JWT is sent in the **`auth-token`** header (not
  `Authorization`), stored in `localStorage` via `src/lib/auth.ts`.
- **Tests:** Vitest + jsdom + Testing Library. Setup: `src/test/setup.ts`
  (stubs `matchMedia`, `ResizeObserver`, `IntersectionObserver`, `PointerEvent`;
  `asyncUtilTimeout: 4000`). `import.meta.env.MODE === "test"` is the in-app
  test gate.

**Repository conventions:**

- One component = `Name.tsx` + `Name.css` (+ `Name.test.tsx` where covered).
- Path aliases: `@/` → `frontend/src/`, `@shared` → `shared/`.
- Commits: Conventional-Commits style, `feat(cloudbook): …` / `fix(cloudbook): …`.
  End commit messages with the `Co-Authored-By` / `Claude-Session` trailer.
- Work on branch `p0-foundation`. Commit only when the user asks (they have been
  asking throughout).
- Prose in this session runs under "caveman" + "ponytail" hooks (terse output,
  minimal code). Code, commits and this doc are written normally.
- Dev servers: `npm run dev -w frontend` (Vite, picks an open port ~5187+).
  Backend not needed for most UI work.

---

## 2. Current Objective

**The signature opening animation** (`src/components/intro/`) — **rebuilt this
session as a stroke-for-stroke recreation of `Downloads/Book.mp4`**, the video
the user supplied as the authoritative reference. Every earlier opening (tear /
destination handoff; then geometric flat-part book; then depth/coherence polish)
is gone. The task was explicitly *copy the video, do not reinterpret*.

**What `Book.mp4` is** (measured, not eyeballed — see §3 for method): a flat
2-D **monoline "open book" icon**, `#e8e8e8` strokes on `#000`, that a pen draws
on one stroke at a time. 5.9 s clip, loops, **no transition out** (ends static).
Stroke timeline from its lit-pixel count per frame:

1. `0–0.16 s` — black.
2. `0.16–1.20 s` — **left page**, one closed stroke, starting at the **spine
   base**: along the bottom edge outward → up the outer edge → along the top
   edge back in → down the spine edge.
3. `1.20–2.06 s` — **right page**, same order, mirrored. No gap after the left.
4. `2.06–2.30 s` hold. `2.30–3.15 s` — **left cover board**: an open bracket
   starting at the **bottom apex under the spine** → out along the bottom → up
   the outer edge to just below the page's top corner.
5. `3.30–4.28 s` — **right cover board** (mirror).
6. `4.40–5.15 s` — **bookmark**: an open notched ribbon on the left page, top
   tucked under the page's top edge, drawn top-left → down → notch → right
   tail → up the right side. It is wide (~54 % of the page) and near the spine.
7. `5.15–5.9 s` — static hold, then loop.

Geometry (frame %, 2731×1440): book bbox x 27.3–72.6 / y 15.6–84.2 (wider than
tall, 1.25:1); page outer edges vertical at x 31 / 69; outer-top corners y 15.5;
spine top y 30; outer-bottom corners y 63; spine base y 75 — the two inner
edges touch and read as one solid spine; cover boards at x 27 / 73, from y 20
down to y 68 then diagonally to a bottom apex at (47, 84) / (53, 84); stroke
68 px ≈ 5.5 % of the book width, round caps + joins. Depth is **only** that
geometry — **no** perspective, `rotateX`, shadow, gradient, fill, page-block,
gutter, settle or page-turn. Per-stroke pace: brief ramp, then a long
deceleration (`cubic-bezier(0.35, 0, 0.2, 1)`).

**In the app:** identical draw sequence, then a brief hold, then the app's
existing `mask: radial-gradient` **circular reveal** wipes from centre to the
running UI underneath (the one thing not in the clip — it loops — kept minimal:
just the mask hole, no book scale/fade). `?introslow` ×6 preserved.

**Implementation:** one inline `<svg viewBox="0 0 100 80">` (the book's 1.25:1
aspect), 5 `<Stroke>` = `<m.path>` each drawn by animating Framer
**`pathLength` 0→1** in `run()` (sequential `animate` + `sleep`, durations = the
clip's stroke spans). `Stroke` gates its own `opacity` on `pathLength > 0` —
otherwise every un-drawn round-capped path paints a dot at its start point.
Sized `min(16vw, 31vh)` → book 14.6 vw / 22 vh, ~200×157 px at 1366×720 (the
clip's 45 / 69 at 0.32×, after three "smaller" requests); stroke 1.4 (clip
4.8; ~3 px on screen); spine edges 9 apart (clip 5, "a small centre gap");
bookmark ~1/3 of the clip's, made uniform. Reveal =
`setInterval` writing `--reveal-r`. No canvas, WebGL, per-frame React or
`useMotionValueEvent`.

**Constraints held:** framer-motion only; lazy-loaded (own chunk, ~1.3 KB gz js
+ ~0.4 KB gz css); `prefers-reduced-motion` → finished book, no drawing, short
opacity fade; never replays on SPA nav; disabled under Vitest. Total ≈ **6.2 s**
at 1× = the clip's 5.15 s of drawing + 0.6 s hold + 0.5 s reveal. Timings are
inline seconds in `run()`; geometry = the 5 path-string consts at the top of
`OpeningScene.tsx`.

---

## 3. Work Completed (this + prior sessions)

### Prior sessions (context — do not redo)

Full frontend rebuild across many commits (`git log` on `p0-foundation`). Highlights:

- **Auth** (`views/AuthPage.tsx`, `components/auth/*`) — one mounted `AuthCard`
  across `/login`↔`/register`, a CSS **curtain-sweep** mode switch, `WrittenLine`
  fields. **[Verified stable — do not redesign.]**
- **Notes workspace** = **Diary + Clipboard** (`views/Workspace.tsx`,
  `components/workspace/*`): a compact vertical notebook (`Notebook.tsx`, class
  `.diary__page`) on the left; a horizontal pile of torn-paper cards
  (`NoteStack.tsx` / `NoteCard.tsx`) on the right. Single-viewport ≥1200px,
  stacked below. List view deleted.
- **Optimistic UI** (`context/NotesContext.tsx`): `addNote → {note, committed}`,
  `editNote`/`deleteNote → {committed}`, `isPending(id)`; `notesRef` mirror for
  synchronous reads; temp ids `temp-<base36>-<seq>`; reconcile keeps the local id
  as the stable React key.
- **Physical paper motion** — the flying sheet on create IS a `NoteFace`
  (pixel-identical markup to `NoteCard`); `TearSheet.tsx` / `ReturnSheet.tsx`
  are motion-value driven (imperative `animate()`), with tension → progressive
  clip-path tear → carry, no phase-state-machine seam.
- **NoteEditor** (`components/workspace/NoteEditor.tsx`) — the card unfolds into
  a full ruled notebook page; Save/Discard/Close/Escape/scrim all fold the page
  back onto the **re-measured live card rect** as one continuous transform
  (`foldAway`, 3 stages: initiation → contraction+travel → placement). No fade
  to hide the handoff. Non-uniform `scaleX/scaleY` so notebook-page proportions
  morph into card proportions; a `.note-editor__content` wrapper counters ~50%
  of the squash + most of the skew so text stays readable; a moving fold crease
  (`--seam` / `--seam-y`); the destination card gets a 1px `[data-received]`
  "took the weight" dip.
- **Ring-binding trace** (commit `1a10c6e`) — `--bind-*` tokens in `tokens.css`
  (`--bind-pitch: 3rem` = measured `.diary__ring` pitch); `.note-card__binding`
  = a low-contrast row of punched holes on `NoteCard` **and** `NoteFace`, so the
  resting card, the flying `TearSheet` and the `ReturnSheet` all keep it;
  `--bind-tension` stretches/dims the holes during the tear; `NoteEditor` close
  cross-fades the diary spiral → the torn-page hole trace (`--bind-morph`,
  counter-scaled by `--sx`/`--sy`).
- **Contact** (`components/contact/ContactLetter.tsx`) — a physical letter
  choreographed after the Portfolio project's `ContactForm.tsx` (phase machine
  writing→sealing→flying→delivered→unsealing, `Envelope`/`FlightTrail`/
  `Delivered`/`Stamp`/`WrittenLine`). Email is `mukuknegi2005@gmail.com` (the
  user's own contact address — they explicitly asked for it). **GitHub removed.**
  `ContactReach` (exported from `ContactLetter.tsx`) — the mailto link + magnetic
  copy button — rendered **under the About note** (`components/About.tsx`), not
  under the letter.
- **About + Contact merged** into one single-viewport horizontal scene at
  `/about` (`components/About.tsx` / `About.css`).
- **Nav** (`components/layout/TopNav.tsx` / `BottomNav.tsx`) — floating
  liquid-glass pill; icon-only Sign Out; theme toggle + Sign Out share a
  magnetic `.topnav__ctrl` family; brand + links magnetic.
- **Search pill** (`components/workspace/NoteToolbar.tsx`) — uses `Field`'s
  `lift` prop for magnetism + a focus **Z-lift** (no blue outline); the search
  icon is `Field`'s built-in `iconStart` so it rides inside the control.
- **Typography:** self-hosted **Poppins** everywhere (`--font-*` all resolve to
  Poppins). Inter + Fraunces removed.
- **Theme:** `ThemeContext` + `lib/themeTransition.ts` (`startThemeReveal`) —
  circular clip-path theme reveal via the View Transitions API, origin =
  `ThemeToggle`'s **resting centre** (fix `e21f1ad`: was the pointer click
  point; now box centre minus the magnetic wrapper's translate).

### Prior opening animation (commits `3efada9` → `5153b63`) — REMOVED

The first opening system (journal opens → 3 page flips → chosen page tears from
the binding → flies to the measured destination rect → paper dissolves onto the
real surface → circular mask reveal) was **deleted whole** this session after
the user rejected it. Not preserved, not tweaked. Kept from that work: the
`--z-intro` token, the `?introslow` QA multiplier, the `mask: radial-gradient`
circular-reveal technique, the reduced-motion / skip / safety-cap patterns, and
the "mount once under `<Router>`, not inside `<Routes>`" rule. The
`NoteEditor` test-mode fold shortcut + `test/setup.ts` `PointerEvent` alias were
general de-flake fixes and stay.

### This session — opening rebuilt as a `Book.mp4` recreation

**Not yet committed.** Parent commit `b7c5ddf`. Supersedes every earlier
opening. `OpeningScene.tsx` + `OpeningScene.css` rewritten whole; `OpeningGate.tsx`
Suspense fallback bg `var(--surface)` → `#050505` (no cream flash before the
lazy chunk loads).

**Reference:** `C:\Users\DELL123\Downloads\Book.mp4` (5.9 s, 2731×1440, loops,
no transition out). The user later referred to it as `Book(1).mp4` — only
`Book.mp4` exists on disk; treated as the same clip.

**How it was measured (second pass, after the user's "geometry is wrong"
feedback):** scratchpad `node:http` **range** server + `<video>` harness, then in
the page: (1) `timeline()` — seek every 0.08 s, draw the frame to a canvas,
count lit pixels → each stroke's start/end time and its pace curve; (2)
`mask()` — threshold the frame to an ASCII grid (120×63 / 80×42) at chosen
times → exact corner positions in frame % **and** the pen's direction per
stroke; (3) a colour histogram → `#e8e8e8` on `#000`. Coordinates were then
scaled into the viewBox (book = 90 units wide, centred) and the result's
`getBoundingClientRect()`s at a 1366×720 viewport compared back to the clip's
frame-% — every path within ~0.3 %. Harness deleted after.

**What the recreation is:** `<svg viewBox="0 0 100 80">` with 5 `<Stroke>`
(`m.path`) — `PAGE_L`, `PAGE_R`, `COVER_L`, `COVER_R`, `MARK` (path-string consts
at the top of `OpeningScene.tsx`, point order = the pen's direction). `run()`
animates each `pathLength` 0→1 in turn with the clip's durations and holds,
then `revealOut()`. Stroke `#e8e8e8` w4.8, round caps/joins, on `#000`.
`Stroke` hides a path until its draw starts (a round-capped path at
`pathLength` 0 paints a dot). **No** fill, gradient, shadow, perspective,
`rotateX`, page-block, gutter, spine element, settle or page-turn.

**Files modified (this pass):**

- `src/components/intro/OpeningScene.tsx` — rewritten whole (see above).
- `src/components/intro/OpeningScene.css` — rewritten whole (black bg, monoline
  ink, the `[data-revealing]` mask; dropped `--book-rev`, `--book-in`, the
  desk-light gradient, drop-shadows, `.opening__book-wrap`, `.opening__stage::before`).
- `src/components/intro/OpeningGate.tsx` — fallback bg → `#050505`.

**NOT touched this pass:** `NotesContext.tsx`, `Workspace.tsx` (Home first-load
fix — still intact), and everything else outside `intro/`.

### This session — section navigation = turning a page

**Not yet committed.** Replaces the old dissolve in
`src/components/transitions/RouteTransition.tsx` / `.css` (same `transitionTo`
API, same mount point in `AppShell`). On `transitionTo(path)`:

1. a static **snapshot** of the current page is `cloneNode`d (ids and
   `data-note-id` stripped, live input values copied) — React state untouched;
2. `navigate(path)` fires **immediately**, so the next section is mounted
   underneath from the first frame (no blank);
3. the snapshot is turned over the spine as a two-panel leaf: the spine half
   (`.page-turn__panel--spine`, origin at the spine edge) rotates 0 → ±104°;
   nested inside it the leading half (`--edge`, origin at the crease) bends a
   further 26° then relaxes to 8°; `backface-visibility: hidden` makes the
   leaf vanish edge-on. Each panel holds a full copy clipped to its half
   (`clip-path: inset`) and backed with `var(--surface)` so the leaf is opaque
   paper. One soft crease shade on the leaf, one soft cast shadow on the page
   beneath (top/bottom feathered), the new page settles from
   `opacity .92 / scale .992`. 560 ms, `cubicBezier(0.45,0.02,0.2,1)` lift.
4. **Direction** from a reading order `/`=0 · `/about`=1 · `/profile`=2 ·
   `/login`=3 · `/register`=4 (unknown = 99): higher index = forward = spine
   on the **left**, leaf turns left; lower = back = mirrored.
5. Motion is a **`setInterval` timer loop writing inline styles** (`cubicBezier`
   from framer for the curves) — Web Animations were tried first and never
   advance in this harness (same trap as the opening's reveal); the loop is
   deterministic and a second `transitionTo` mid-turn just cancels + removes
   the previous leaf. `?introslow` stretches the turn ×6 like the opening.
6. Instant (plain `navigate`) under reduced motion and between `/login` ↔
   `/register` (auth mode switch), as before. Browser back/forward (`popstate`)
   still swaps instantly — it never went through `transitionTo`.

`BottomNav.tsx` now routes its links + sign-out through `transitionTo` so mobile
turns too (was plain `NavLink`). Login/register forms still call `navigate()`
directly (post-submit redirects, unchanged).

Verified (Playwright, `/about` ↔ `/login`, `?introslow` + an in-page
`performance.now` freeze for frozen frames): spine 10° → 76° → 100°, bend
9° → 26° → 15°, leaf opaque (frozen frame at p 0.3 reads as a lifting sheet
with a visible crease), sheet + inline styles + host `min-height` all cleared at
the end, rapid double-navigation leaves exactly one leaf and lands correctly,
0 console errors; gates green.

### This session — drag the nav to turn the page by hand

**Not yet committed.** Adds an interactive scrub over the existing page turn —
the turn visuals are untouched, only the way it is driven changes.

- **`RouteTransition.tsx`** — `startTurn` refactored into `createTurn(host,
  stage, initialDir) → { frame(p), setDir(dir), play(to, ms, onDone),
  cancel(), get p }`. `frame(p)` is byte-identical to before (spine
  `104°·lift(p)`, crease bend, shade, cast, stage settle). The snapshot is
  `cloneNode`d **once** into two `__copy` panels; `setDir` re-hangs those same
  copies for a new direction without re-snapshotting. New context method
  `dragTurn()` returns a `DragTurn` controller: `setTarget(path)` (provisional
  `navigate` — first is a push, rest are `replace`, so one gesture = ≤1 history
  entry; passing the origin path flattens the leaf and `navigate(-1)`s),
  `progress(p)` (scrubs `frame`), `release(commit)` (`play` to 1 or, on
  cancel, `navigate(-1)` then `play` to 0). `transitionTo()` for clicks now =
  `createTurn` + `navigate` + `play(1)` — same behaviour as before. Returns
  `null` under reduced motion / auth-switch.
- **`hooks/useDragTurn.ts`** (new) — the gesture. Portfolio `Navbar` model for
  target: `DRAG_THRESHOLD_PX 6`, `abs(dx) > abs(dy)`, `setPointerCapture`,
  geometry cached once per gesture, nearest item centre, `TARGET_HYSTERESIS_PX
  14`, 300 ms click-suppression (`guardClick`). Portfolio `IntroOverlay` model
  for scrub: `rawRef` written on each move, a 60 fps `setInterval` chases it
  (`CHASE_TAU_MS 40`) into `ctrl.progress`, 6-sample `performance.now` velocity.
  `progress = travel(originX → pointer, signed toward target) / max(centre
  distance, MIN_RANGE_PX 110)`, clamped. `originX` = the origin item's centre,
  or the pointer-down x when the section in view is not a nav item (`/login`,
  `/register`). Release: `commit = v > 0.5 → true; v < -0.5 → false; else p >=
  0.45`. Publishes `{ handlers, dragging, targetPath, guardClick, indicator }`
  — `indicator` is the pill's live geo, set by the same loop.
- **`NavIndicator.tsx`** — new `override?: Geo | null` prop: while non-null the
  pill sits there with no spring (tracking the pointer), when it clears the
  pill springs onto the freshly measured target. `activeKey` on TopNav is
  `` `${drag.dragging}:${pathname}` `` so ending the drag forces a re-measure.
- **`TopNav.tsx` / `BottomNav.tsx`** — spread `drag.handlers` on the list,
  `ref` each item, wrap the click in `drag.guardClick`. `BottomNav` also gained
  `useLocation` + item refs (was plain `NavLink`s).
- **`TopNav.css` / `BottomNav.css`** — `.topnav__list` / `.bottomnav__list`
  get `touch-action: pan-y` (horizontal = page turn, vertical = scroll).

Verified (Playwright, dispatched `PointerEvent`s — CDP synthetic mouse +
`setPointerCapture` stops delivering moves, so tests dispatch events directly):
progressive scrub follows the drag (spine 21° → 64° → 81° → 93° → 99°), commit
past 0.45 lands on target, release-before / reverse-flick / `pointercancel` all
fall back to the origin with the leaf settling to 0, re-targeting to the origin
mid-gesture flattens the leaf, non-nav origins scrub via the pointer-down
fallback, indicator returns to the origin item on cancel, BottomNav mobile drag
works (`pan-y` confirmed), vertical drag on the bar does nothing, reduced-motion
drag falls back to plain navigation, keyboard Enter still navigates, no stuck
sheets, 0 console errors; `tsc`/`eslint` 0 err/6 warn/`vitest` 64·13/`build`
green.

**Limitations:** (1) one router outlet, so a **cancelled** drag remounts the
origin section — notes reload instantly from context but transient local UI
(unsent search text) resets; commit has no such cost. (2) On `/login` /
`/register` the section in view is not a nav item, so the first ~1–2 frames
after crossing into an item read progress 0 until the pointer passes that
item's centre; it scrubs normally after. (3) With only 2 nav items (unauth)
they sit ~71 px apart while `MIN_RANGE_PX` is 110, so dragging exactly onto the
target reaches ~0.65 progress — release then finishes it (matches the reference
model; dragging past the last item still reaches 1.0 via pointer capture).

### Earlier this session (superseded, still uncommitted) — for context only

The tear / destination-handoff opening (commits `3efada9`→`5153b63`) was deleted
whole; a geometric flat-part book with `spineGrow`/`spread`/`edgeIn` + subtle
depth replaced it; a 10-point polish pass tuned that + fixed a frozen reveal
(`setInterval`-driven `--reveal-r`, the mechanism kept). The `Book.mp4` rebuild
above replaces all of that visual work but **keeps**: the `setInterval` reveal,
`?introslow`, the reduced-motion / Escape-skip / safety-cap patterns, and these
still-valid non-`intro/` changes from that work:

- `src/App.tsx` — `<OpeningGate />` under `<Router>` after `</RouteTransitionProvider>`.
- `src/components/auth/AuthCard.tsx` / `src/components/Profile.tsx` — dead
  `data-intro-target` removed.
- `src/components/workspace/TearSheet.tsx` — `EDGE_*` un-exported (still used internally).
- **`src/context/NotesContext.tsx` + `src/views/Workspace.tsx` — Home first-load
  fix** (below).
- Deleted: `IntroOrchestrator.tsx`, `IntroScene.tsx`, `IntroScene.css`,
  `src/lib/introDestinations.ts` + `.test.ts`.

**Home "notes blank until you navigate away and back" fix:**
- `NotesContext.getNotes` — the concurrency guard was a boolean that **dropped**
  a second caller (`if (inFlight.current) return`). Now `inFlight` holds the
  in-flight `Promise`; concurrent callers **join** it (`inFlight.current ??= …`),
  and it clears to `null` in `finally`. A second trigger can no longer leave the
  store un-loaded.
- `Workspace` — the initial-fetch effect was `useEffect(() => void getNotes(),
  [getNotes])` (fires once on mount, fire-and-forget). Now
  `useEffect(() => { if (status === "idle") void getNotes(); }, [status,
  getNotes])` — any render that finds the store still `idle` drives the fetch,
  not just the first mount. Side benefit: returning to Home with `status ===
  "ready"` no longer refetches → no skeleton flash on section re-entry.
- **Could not reproduce locally** (40+ loads: dev+prod, fast/slow/mid network,
  reduced-motion, 1100/1400px, StrictMode). The most plausible cause is a
  transient `Workspace`/provider teardown during the opening overlay leaving the
  surviving mount at `status: "idle"` with the real fetch's result lost to the
  discarded tree; the two changes make the load **idempotent + self-healing**
  against that class without a delay or forced re-render. If it recurs, next
  look: bound `api.fetchNotes` with an `AbortController` timeout so a hung
  request can't wedge `status` at `"loading"`.

**Untouched (general fixes from the old intro commit, still valid):**
`src/components/ui/Icon.tsx` `book` glyph (open-journal path — also used by
`BottomNav`), `NoteEditor.tsx` test-mode fold shortcut, `NoteEditor.test.tsx`,
`src/test/setup.ts` `PointerEvent` alias, `--z-intro` token.

**Key implementation decisions (this session):**

1. **Copy the clip, don't reinterpret** (explicit user instruction). Black bg,
   light monoline, flat 2-D geometry, exact stroke order (L page → R page → L
   cover → R cover → bookmark). No CloudBook "Lit Desk" recolour, no added
   depth/gloss/particles/bounce — none of that is in `Book.mp4`.
2. **Opaque full-screen overlay, app renders underneath from frame 1.** The
   reveal just exposes whatever route is live. No destination logic.
3. **`pathLength` per path, sequenced in `run()`.** Framer sets the stroke-dash;
   round caps make each stroke's start read as a pen touch-down. No imperative
   `d` morphs, no `useMotionValueEvent` (the page-turn that used them is gone).
4. **Circular reveal kept, minimal.** `Book.mp4` has no transition out (it
   loops), but the app needs one — reuse the existing `mask: radial-gradient`
   hole (`setInterval` writing `--reveal-r`), ~0.5 s, no book scale/fade. Last
   `await` in `run()`, after the final hold.
5. **Lazy-loaded**, own chunk (~1.3 KB gz js + ~0.4 KB gz css — smaller than any
   prior version).
6. **Reduced motion is not a skip** — finished book (all `pathLength` = 1), no
   drawing, ~0.7 s hold, 0.3 s opacity fade.
7. **No WebGL/R3F.**
8. **`?introslow` ×6** kept as the trace aid.

---

## 4. Current Implementation State

### Verified working (this session, via Playwright + gates)

- **[Verified]** `Book.mp4` inspected frame-by-frame; the recreation's stroke
  order + geometry frame-compared to it. Silhouette (splayed trapezoid pages,
  centre spine, offset cover boards, notched bookmark on the left page) matches.
- **[Verified]** Sequence at `?introslow` ×6: ink dot → left page draws →
  right page draws → hold → left cover draws → right cover draws → hold →
  bookmark draws → hold → circular reveal (`--reveal-r` grows, `setInterval`) →
  `.opening` unmounts onto the running app. Reveal is the **last** `await` in
  `run()` — book provably complete first.
- **[Verified]** App usable + mounted *under* the overlay from frame 1:
  `/workspace-preview` shows **8 note cards during AND after** the opening;
  `/login` form present throughout. `.opening` gone from DOM after; **no blank
  frame**; **no replay** on SPA nav; **0 console errors**.
- **[Verified]** Total ≈ **4.5 s** at 1× (raw Playwright ~5.9 s, ~30 % inflated):
  draw ≈ 4.0 s + holds + reveal ≈ 0.46 s. Close to the clip's ~5.4 s of drawing
  (the clip has no reveal).
- **[Verified]** Background is `#050505` throughout (screenshots); strokes
  `#ececec` monoline, round caps.
- **[Verified]** Reduced motion (`emulateMedia`): finished book, no drawing,
  short fade, lands on the usable app.
- **[Verified]** Gates: `tsc -b` clean · `eslint` 0 errors / 6 known warnings ·
  `vitest` 13 files / 64 passed · `vite build` clean, `OpeningScene` chunk
  **2.56 KB / 1.29 KB gz js + 0.72 KB / 0.39 KB gz css**, main `index.js`
  63.97 KB gz.

### Partially verified / unverified

- **[Unverified]** Normal-speed *feel* on a real screen vs `Book.mp4` side by
  side — Playwright can't screenshot mid-draw at 1×; verified via `?introslow`.
  User's call. Tuning = the path consts + inline `run()` seconds in
  `OpeningScene.tsx`.
- **[Unverified]** Live authed Home (`/`) — checked with mock data
  (`/workspace-preview`) + the auth route only; no JWT here. Opening is
  route-agnostic (overlay + centre-out reveal).
- **[Unverified]** OS-level reduced motion in a real browser (only emulated);
  breakpoints other than ~900/1100 wide (SVG scales with its `min()` container).

### Not done / out of scope

- **[Planned]** `frontend/public/favicon.ico` not regenerated (unrelated).
- No user-visible recording producible from this harness.

---

## 5. Current Progress / Checkpoint

**Where work stopped:** working tree **uncommitted**, parent `b7c5ddf`.
`OpeningScene.tsx` + `.css` are a **measured** recreation of
`Downloads/Book.mp4` — a flat monoline open-book icon (`#e8e8e8` on `#000`) a
pen draws on: left page → right page → left cover → right cover → notched
bookmark → hold → circular reveal to the app. 5 `<Stroke>` paths, each Framer
`pathLength` 0→1 in `run()` with the clip's own stroke spans. No fill / shadow /
gradient / perspective / settle / page-turn — none is in the clip. ≈ 6.2 s at 1×.

**Last completed step — section navigation is now a page turn** (see §3 "This
session — section navigation = turning a page"): `RouteTransition.tsx/.css`
rewritten (snapshot leaf, two-panel bend, direction from route order, timer
loop, `?introslow`), `BottomNav.tsx` wired to `transitionTo`. Opening untouched.
Gates green. Not committed.

**Before that — sixth pass on the opening: "halves must mirror; fill the bookmark":**
geometry was already an exact mirror (`x' = 100 − x` for every page/cover
point) — verified at 1366×720: left/right page and cover bboxes mirror to
0.39 px (the whole SVG's sub-pixel centring), y identical. Bookmark now
`<Stroke filled>` → `.opening__ink--filled { fill: #e8e8e8 }` (same ink as the
lines, not pure white — avoids a visible edge) with `fillOpacity` bound to the
draw progress so it fades in as the pen outlines it. Gates green.

**Fifth pass before that — "half the size, half the thickness, bookmark 1/3
and uniform":** stage `min(32vw,62vh)` → `min(16vw,31vh)` (book
~200×157 px at 1366×720, centred; mobile `58vw` → `29vw`); stroke 2.8 → 1.4
(viewBox units — combined with the half-size box that is ~3 px on screen, ¼ of
before; if the user meant absolute, 2.8 gives 6 px); `MARK` →
`M27,10.7 L27,22.7 L30,21.7 L33,25.5 L33,13.5` (6×12 units, equal-length sides
hanging from the sloped top edge, centred notch). Verified numerically +
zoomed screenshot; 8 cards under the overlay; gates green.

**Fourth pass before that — "even smaller, even thinner"** (CSS only): stage
`min(40vw,77vh)` → `min(32vw,62vh)`; stroke 3.6 → 2.8.

**Third pass before that — three parameter tweaks on the accepted animation**
("smaller book, thinner strokes, small centre gap"; concept/sequence/timing/
colour untouched): stage `min(50vw,96vh)` → `min(40vw,77vh)`; stroke 4.8 → 3.6;
page inner edges x 47.5/52.5 → 45.5/54.5 and cover apexes 44.1/55.9 →
42.1/57.9 (outer edges, y values, bookmark unchanged).

**Second pass before that** ("duplicate stacked outlines, V not wide enough,
too small, wrong proportions/timing"):
re-measured the clip numerically (lit-pixel timeline + ASCII threshold masks +
colour histogram, method in §3) instead of eyeballing screenshots. Result:
book bbox now within ~0.3 % of the clip's at the same aspect; covers sit a
clear gap outside the pages (was a doubled line); wide V (page top edges drop
15 → 30 % of frame height to the spine); stroke 4.8 (was 2); book 45 vw / 69 vh
(was ~20 vw); pen direction per stroke matches (pages start at the **spine
base**, covers at the **bottom apex**, bookmark at its top-left); per-stroke
durations 1.04 / 0.86 / 0.85 / 0.98 / 0.75 s with the clip's holds; stray
start-point dots on un-drawn paths removed (`Stroke` opacity gate).

**Verified:** gates green (`tsc` · `eslint` 0/6 · `vitest` 64/13 · `build`,
`OpeningScene` chunk 1.34 KB gz js + 0.38 KB gz css). Playwright at 1366×720:
every path's bbox vs the clip's frame-% within ~0.3 %; un-drawn paths at
opacity 0 while the left page draws; `/workspace-preview` shows 8 note cards
during + after; Escape skip lands clean; 0 console errors. `NotesContext` /
`Workspace` untouched — Home first-load fix intact.

**There is no unfinished in-flight edit.**

**Next step:**
1. **Commit** (`feat(cloudbook): opening — recreate Book.mp4 (monoline pen-draw
   book)` + trailer). Not yet done.
2. User's verdict from a real screen against `Book.mp4` side by side. Tune the
   path-string consts (`PAGE_L/R`, `COVER_L/R`, `MARK`) + the inline `run()`
   seconds in `OpeningScene.tsx`; stroke look in `.opening__ink`.
3. Reveal is `setInterval`-driven in `revealOut()` — **do not** swap it to a
   Framer tween or `@property` keyframe (both freeze this late in `run()` under
   `<LazyMotion>`).
4. **[Unverified]** Live authed Home (`/`, real JWT).

---

## 6. Files & Code Locations

### The opening animation (the current focus)

| Path | Responsible for |
|---|---|
| `src/components/intro/OpeningGate.tsx` | Gate. `DISABLED = import.meta.env.MODE === "test"`. `done` state (starts `DISABLED`). `lazy(() => import("./OpeningScene"))` inside `<Suspense>` (fallback = inline-styled `#050505` full-screen div). `onDone` sets `done` → renders `null` forever. Mounted in `App.tsx` under `<Router>`, after `</RouteTransitionProvider>` — outside `<Routes>`, one mount per document, no remount on nav. |
| `src/components/intro/OpeningScene.tsx` | **Default export** (lazy). One inline `<svg viewBox="0 0 100 80">` + 5 `<Stroke>` + Framer, no per-frame React. **Geometry** = 5 path-string consts at the top, measured from the clip (book 90 units wide, centred, symmetric about x=50): `PAGE_L` `M45.5,66.3 L12.5,53.7 L12.5,4 L45.5,19.3 Z` / `PAGE_R` mirror (closed; point order = pen direction: spine base → bottom → outer edge → top → spine edge; inner edges 9 apart = the requested centre gap); `COVER_L` `M42.1,75.7 L4.4,59 L4.4,8.9` / `COVER_R` mirror (open; apex → bottom → up outer edge); `MARK` `M27,10.7 L27,22.7 L30,21.7 L33,25.5 L33,13.5` (open notched ribbon, ~1/3 of the clip's, uniform sides). `Stroke({d, draw, filled?})` = `m.path` with `pathLength: draw` + `opacity: useTransform(draw,[0,0.001],[0,1])` (hides the start-point dot); `filled` adds `.opening__ink--filled` + `fillOpacity: draw` (the bookmark). Motion values `drawPageL/R`, `drawCoverL/R`, `drawMark` (0→1) + `sceneOpacity` (reduced-motion exit). `run()` = `nap(0.16)` → `stroke(drawPageL,1.04)` → `stroke(drawPageR,0.86)` → `nap(0.24)` → `stroke(drawCoverL,0.85)` → `nap(0.15)` → `stroke(drawCoverR,0.98)` → `nap(0.12)` → `stroke(drawMark,0.75)` → `nap(0.6)` → `revealOut()`; per-stroke ease `[0.35,0,0.2,1]`. `revealOut()` = `setInterval(1000/60)` writing `--reveal-r` 0.5→160 (`hole = p²`), ~0.5 s. `runStatic()` (reduced motion): all `pathLength`=1, hold 0.7 s, `sceneOpacity`→0. `TS` = `?introslow`?6:1. 9 s cap; Escape / pointerdown → fast `revealOut`. |
| `src/components/intro/OpeningScene.css` | `.opening` (fixed opaque overlay, `z-index: var(--z-intro)`, `background: #000`, `--reveal-r`; `[data-revealing]` → `mask: radial-gradient(circle calc(var(--reveal-r)*1vmax) at 50% 50%, transparent 78%, #000)` + `pointer-events: none`). `.opening__stage` (`width: min(16vw, 31vh)` → book 14.6 vw / 22 vh, the clip's 45/69 at 0.32×; `min(29vw, 31vh)` under 600px). `.opening__svg` (`overflow:visible`). `.opening__ink` (`fill:none; stroke:#e8e8e8; stroke-width:1.4; round caps + joins`). No fills, gradients, shadows, perspective. |

*(No destination registry, no `data-intro-target`, no flyer, no fills, no
3-D. The SVG scales with its `min()` box; the reveal is centre-out over
whatever route is live underneath.)*

### App shell / routing

| Path | Responsible for |
|---|---|
| `src/App.tsx` | Provider tree + `<Routes>` + `<OpeningGate />` (under `<Router>`, after `</RouteTransitionProvider>`). `<LazyMotion features={domMax} strict>`. |
| `src/main.tsx` | Root render, imports `styles/fonts.css` + `tokens.css` + `global.css`. |
| `src/components/layout/AppShell.tsx` | Skip link, `DeskBackdrop`, `TopNav`, `<main>` wrapping `RouteTransitionStage`, `BottomNav`, `ToastRegion`. |
| `src/components/transitions/RouteTransition.tsx` / `.css` | `RouteTransitionProvider` + `useRouteTransition() → { transitionTo, dragTurn }` — **page-turn** on internal nav (NOT the intro). `createTurn(host, stage, initialDir) → { frame(p), setDir, play(to,ms,onDone), cancel, p }` clones `.route-stage` once into a two-panel leaf (`.page-turn` → `__panel--spine` ⊃ `__panel--edge`, each `__copy` clipped to its half + `__shade`; `__cast` on the host). `frame(p)` = the visual (spine `104°·lift(p)`, crease bend, `bump()` shade/cast, stage settle) — **do not touch**. `transitionTo(path)` (clicks) = `createTurn` + `navigate` + `play(1)`. `dragTurn()` (from `useDragTurn`) returns `{ setTarget, progress, release }` for a scrubbed turn. `PAGE_ORDER` decides forward/back. `RouteTransitionStage` = `.route-host` (perspective, `registerHost`) ⊃ `.route-stage`. Instant under reduced motion / auth-mode switch. |
| `src/hooks/useDragTurn.ts` | Drag across a nav list to scrub the page turn. Portfolio `Navbar` model for target selection + portfolio `IntroOverlay` model for progress/velocity/settle, feeding the app's own `dragTurn()`. Returns `{ handlers, dragging, targetPath, guardClick, indicator }`. Used by `TopNav` + `BottomNav`. See §3 "drag the nav to turn the page". |
| `src/routes/RequireAuth.tsx` | Renders `null` while `status === "loading"`, `<Navigate to="/login">` when anonymous. **Note: the redirect drops the query string, so `?introslow` is lost when hitting `/` unauthenticated.** |

### Workspace (Diary + Clipboard) — the Notes surface

| Path | Responsible for |
|---|---|
| `src/views/Workspace.tsx` | Orchestrates create/edit/delete + the TearSheet / ReturnSheet / NoteEditor overlays. `noteRect(id)` helper. `handleCreated` / `handleTearDone` / `handleDelete` / `handleReturnDone` / `openEditor` / `handleSave`. |
| `src/components/workspace/Notebook.tsx` | The diary (`.diary__page`, `.diary__written`, `.diary__binding` spiral, `.diary__tear` tab). Fires `onCreated(note, writtenRef.rect)`. |
| `src/components/workspace/NoteStack.tsx` | The clipboard — columns of `NoteCard`. Per-slot `--rot`/`--tx`/`--z`. `suppressed`(hiddenId)/`arrived`(arrivedId) → `{duration:0}` for the instant handoff. |
| `src/components/workspace/NoteCard.tsx` / `NoteFace.tsx` | The resting card / its non-interactive twin (pixel-identical markup — `.note-card__sheet`, `.note-card__tear`, `.note-card__binding`, `.note-card__reader`, `.note-card__foot`). `NoteFace` is what flies. |
| `src/components/workspace/TearSheet.tsx` | Create flight. **Exports `EDGE_FLAT/NICK/HALF/TORN/SETTLE`** (also used by the intro). Tension → progressive clip tear (lift starts before tear done) → hand-carry arc + rotational inertia → lands on the exact slot; edge relaxes to `EDGE_FLAT`; destination card `[data-received]` dip. |
| `src/components/workspace/ReturnSheet.tsx` | Delete — inverse of tear, merges into the diary written area. |
| `src/components/workspace/NoteEditor.tsx` | Card→page open + `foldAway` close (3 stages, re-measured live card rect, `--seam`/`--seam-y` fold crease, `.note-editor__content` counter-scale, `--bind-morph` spiral↔hole crossfade, `[data-received]` card dip). Test-mode + reduced-motion shortcut to `then()`. |
| `src/components/workspace/NoteToolbar.tsx` | Search (`Field` `lift`, `iconStart="search"`), magnetic `TagChip`s, `SortMenu`. |

### Other surfaces

| Path | Responsible for |
|---|---|
| `src/components/About.tsx` / `About.css` | `/about` = About intro + `<ContactLetter/>` + `<ContactReach/>` in one horizontal single-viewport scene. |
| `src/components/contact/ContactLetter.tsx` | The physical letter (phase machine); exports `ContactLetter` **and** `ContactReach` (mailto + magnetic copy button, `mukuknegi2005@gmail.com`). |
| `src/views/AuthPage.tsx` + `src/components/auth/AuthCard.tsx` | `/login` + `/register`, one mounted instance, CSS curtain-sweep mode switch. |
| `src/components/Profile.tsx` | `/profile` — `<Surface level={2} className="profile__card" data-intro-target="profile">`. |
| `src/views/WorkspacePreview.tsx` | Dev-only `/workspace-preview` — the workspace with mock data (bypasses auth). Used heavily for animation QA. Note ids `preview-0..N`. |

### Foundations

| Path | Responsible for |
|---|---|
| `src/styles/tokens.css` | All design tokens. `--z-intro: 2000`. `--bind-pitch/hole/inset/ink/lip` (+ dark overrides). `--control-h: 2.375rem`. `--rule-line`. Poppins `--font-*`. `--tracking-tight`. |
| `src/styles/global.css` | Reset, `sr-only`, reduced-motion backstop, `[data-theme-transition]` circular-reveal CSS (for `themeTransition.ts`). |
| `src/utils/motion.ts` | `duration`, `ease` ({standard, entrance, exit, press}), `spring` ({snappy, soft, indicator}), `reveal` ({durationMs 700, easing}), `authCurtain`, `budget`, variants. |
| `src/context/NotesContext.tsx` | Optimistic notes store (see §3). |
| `src/context/AuthContext.tsx` | `status: "loading"\|"authenticated"\|"anonymous"` (starts `loading` only if `getToken()`), `user`, `isAuthenticated`, `login`/`signup`/`logout`. |
| `src/context/ThemeContext.tsx` + `src/lib/themeTransition.ts` | Theme state + `startThemeReveal(next, origin, applyTheme)` (View Transitions API circular clip reveal). |
| `src/lib/api.ts` / `apiClient.ts` / `auth.ts` | Typed API wrappers, `apiRequest`, JWT in `auth-token` header via localStorage. |
| `src/hooks/useReducedMotion.ts` | `useSyncExternalStore` on `(prefers-reduced-motion: reduce)`. |
| `src/hooks/useMagnetic.ts` | `{ ref, onMouseMove, onMouseLeave, style, enabled }` — gated `(pointer: fine)` + non-reduced-motion. |
| `src/components/ui/Icon.tsx` | Inline SVG icon set (24-grid, `currentColor`, 1.75 stroke). `book` = the refined open-journal compound path. |
| `src/components/ui/Field.tsx` | Form-control primitive. `lift` prop = magnetism + focus Z-lift (no blue ring) + firmer graphite border + `--elev-field-focus`; `iconStart`/`icon`. |
| `src/test/setup.ts` | Vitest globals — stubs incl. the `PointerEvent`→`MouseEvent` alias. |

### Backend (reference only — **do not modify**)

- `backend/routes/auth.js` — `POST /api/auth/createuser`, `POST /api/auth/login`,
  `POST /api/auth/getuser` (JWT in `auth-token` header).
- `backend/routes/notes.js` — `GET /fetchallnotes`, `POST /addnote`,
  `PUT /updatenote/:id` (→ `{note}`), `DELETE /deletenote/:id` (→ `{Success, note}`).
- `backend/models/{User,Note}.js` — Mongoose schemas. `Note`: `user, title,
  description, tag (default "General"), date`.

---

## 7. Technical Decisions & Reasoning

| Decision | Alternatives considered | Why chosen |
|---|---|---|
| **Copy `Downloads/Book.mp4` exactly** — black bg, light monoline, flat 2-D, stroke order L page → R page → L cover → R cover → bookmark | Render it in CloudBook "Lit Desk" material (warm paper, graphite ink, desk glow) — what the *previous* opening did | Explicit user instruction: "This is a COPY/RECREATION task, not a creative redesign… Do not reinterpret." The clip is the authority; the app's theme is not. |
| All-SVG, one `pathLength` per path, sequenced in `run()` | CSS-3D; canvas; imperative `d` morph | The clip is 2-D monoline; a `viewBox` drawing *is* that and `pathLength` *is* "a pen draws the line". No `useMotionValueEvent` / `d`-morph needed (no page-turn in the clip). |
| No fills / shadows / gradients / perspective / `rotateX` / settle / page-turn | Keep the prior version's subtle depth + settle + page-turn | None of it is in `Book.mp4`. "Do not add extra animation effects." |
| No WebGL / R3F | Add `three` + R3F | 2-D monoline; SVG covers it. Not installed. |
| Reduced motion = static finished book + 0.3 s opacity fade (not a skip) | Mount nothing | "Provide a reduced/static version, do not simply remove the concept." |
| Circular reveal kept for the transition out (the clip has none — it loops) | Hard cut; a new transition | The app must get from the black opening to the route; reuse the existing `mask: radial-gradient` hole (`setInterval` `--reveal-r`), minimal (~0.5 s), no book scale/fade. |
| No module "already played" flag; rely on `done` state + mount position | `sessionStorage`; a module `let` | The module flag broke under React StrictMode's double-mount. `OpeningGate` outside `<Routes>` never remounts on nav, so state is enough. Reload = fresh mount = plays again. |
| `EDGE_*` polygons back to `const` (un-exported) | Leave them exported | They were only exported for the deleted `IntroScene`. Dead API; still used internally by `TearSheet`. |
| `?introslow` (×6) kept permanently as a dev aid | Remove after QA; a `window.__` global | Guarded (`URLSearchParams`, default ×1), zero prod cost, and the *only* way to observe the sequence given Playwright's rAF throttling. |
| `PointerEvent = MouseEvent` in `test/setup.ts` | Ignore the intermittent failures; pin an older framer | framer v11's keyboard press-gesture (`Enter`/`Space` on a `whileTap` element) constructs a `PointerEvent`; jsdom lacks it → an uncaught exception occasionally failed an unrelated test. The alias is harmless (jsdom `MouseEvent` covers what framer reads). |
| `NoteEditor.foldAway` shortcuts under `MODE === "test"` | Longer `waitFor`; fake timers | The fold is ~700 ms of framer animation; under parallel jsdom load it starved rAF and blew even a 2.5 s `waitFor`. The test verifies the *contract* (`onSave`/`onClose` called), not the animation — which is covered in the browser. |
| Book icon = open-journal compound path | Keep the closed-book glyph; a multi-`<path>` Icon variant | `Icon` renders one `<path>`; a compound `d` avoids changing the component. Open journal ties to the intro book (§28/§29). |

---

## 8. Dependencies / Integration Points

- **Backend API** — `https://cloud-book-backend.onrender.com` (Render). Frontend
  reads `VITE_API_URL` (see `frontend/.env` / vite env; tests stub it to
  `http://test.local`). JWT in **`auth-token`** header, stored in `localStorage`
  key `token` (`src/lib/auth.ts`). Endpoints: see §6 / `shared/types` `API_ROUTES`.
  **The opening reads nothing from context and makes no API calls** — it only
  needs `useReducedMotion()`. (The old intro read auth + pathname; no longer.)
- **Deploy targets** — frontend → Vercel, backend → Render. `frontend/dist` is
  the build output.
- **MongoDB** — Mongoose, backend only. Not touched.
- **Fonts** — self-hosted Poppins woff2 in `frontend/public/fonts/`, preloaded in
  `frontend/index.html`, `@font-face` in `src/styles/fonts.css`.
- **`shared/types`** — the single source of the API contract; imported via
  `@shared`. If backend behavior ever changes, this file changes with it.
- **Config files** — `frontend/vite.config.ts` (aliases, `manualChunks` splits a
  `vendor-react` chunk, vitest `test` block). `frontend/tsconfig*.json`. ESLint
  flat/legacy config in `frontend/`.
- **Reference / QA assets** (not in repo) — the current opening reference is
  `C:\Users\DELL123\Downloads\Book.mp4` (5.87 s monoline open-book icon loop,
  no transition out). To inspect a video: no ffmpeg here — serve a `<video>`
  harness page over http from a tiny `node:http` **range-capable** static server
  in the **scratchpad** (plain 200 responses don't let the browser seek; add
  `206`/`content-range` handling), then `video.currentTime = t` + `seeked` +
  Playwright screenshot, then delete the
  scratchpad files. The old references (`…014231.mp4`, `…021242.mp4`,
  `…021337.mp4`) are gone from that folder.

---

## 9. Testing & Verification

**Ran this session (uncommitted tree, parent `b7c5ddf`):**

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc -b` (in `frontend/`) | **clean** |
| Unit | `npx vitest run` | **64 passed / 13 files** (was 70/14 — `introDestinations.test.ts` removed with the resolver) |
| Lint | `npx eslint .` | **0 errors**, 6 known `react-refresh/only-export-components` warnings (context files) |
| Build | `npm run build` | **clean** — `OpeningScene` chunk: `OpeningScene-*.js` 2.53 KB / **1.34 KB gz**, `OpeningScene-*.css` 0.70 KB / **0.38 KB gz**; main `index-*.js` **63.97 KB gz**, `vendor-react` 53.57 KB gz |

**Playwright verification (`Book.mp4` recreation, second pass):**

- `Book.mp4` measured numerically (§3): lit-pixel timeline every 0.08 s →
  stroke spans; ASCII threshold masks → corner positions + pen direction;
  colour histogram → `#e8e8e8` / `#000`.
- At a 1366×720 viewport (the clip's 1.9:1): book bbox x 27.2–72.8 / y
  15.8–83.9 vs clip 27.3–72.6 / 15.6–84.2; each path's bbox likewise within
  ~0.3 %; stroke 32.8 px vs clip-equivalent 34 px.
- Mid-draw: un-drawn paths at `opacity: 0` (no stray start dots); pen starts
  where the clip's does.
- `/workspace-preview` — **8 note cards during AND after**; Escape skip lands
  clean; **0 console errors**. Total ≈ 6.2 s at 1× (≈ clip 5.9 s + reveal).
- Reduced-motion (`emulateMedia`, earlier pass) — static finished book, fade.

**Still needs testing (user / real browser):**

1. Side-by-side feel vs `Book.mp4` at 1× (Playwright can't screenshot mid-draw).
2. Live authed Home (`/`, real JWT) — `/workspace-preview` (mock) + auth route only here.
3. Breakpoints; OS-level reduced motion (JS-path only).

**Known Playwright limitation:** `browser_take_screenshot` waits for
animation-idle and can miss mid-animation frames (rAF throttled under CDP).
Watch the sequence via `?introslow` + DOM sampling; no real recording is
producible from this harness.

---

## 10. Known Issues / Risks

- **[Not committed]** The whole change is an uncommitted working tree. Commit
  before doing anything else.
- **[Landmine] The reveal must stay `setInterval`-driven** (`revealOut()` in
  `OpeningScene.tsx`). A Framer motion value (`animate(mv)` / `style` binding)
  and a `@property` + `@keyframes` custom-prop interpolation were both tried for
  it — both freeze (value never ticks) this deep in the `run()` chain under
  `<LazyMotion>`. The interval writes `--reveal-r` to the root each frame; it
  starts at 0.5 (tiny) so there is no large-circle pop.
- **[Design choice — confirm with user]** The opening is **black + white
  monoline**, matching `Book.mp4` literally, not CloudBook's warm "Lit Desk"
  palette. If the user wants it themed, recolour `.opening` bg + `.opening__ink`
  stroke; the geometry/timing stay.
- **[Limitation] `Book.mp4` has no transition out** — it loops. The circular
  reveal to the route is the app's own bridge; if it feels tacked-on, that is
  why (nothing in the clip to copy). Keep it minimal.
- **[Limitation] `?introslow` still lost on `/`→`/login` redirect** (`RequireAuth`
  drops the query). Trace on `/login?introslow` instead.
- **[Pre-existing] `SortMenu.test.tsx`** sometimes logs `Unhandled Errors: 1`
  (framer async teardown) without failing — cosmetic, ignore. Also seen in this
  session's run.
- **[Do not regress]** Everything in §3 "Prior sessions" — auth flow, Home, nav
  structure, Notes data model, optimistic mutations, Contact, About, reduced
  motion, dark mode, the RouteTransition dissolve, the theme reveal. The opening
  must not replace any existing section transition (it doesn't — it's a
  document-entry overlay only).

---

## 11. Next Steps (ordered, actionable)

1. **Commit** the current tree: `feat(cloudbook): opening — recreate Book.mp4
   (monoline pen-draw book)` + the `Co-Authored-By` / `Claude-Session` trailer.
2. **Get the user's verdict** — ideally a screen recording of the result next to
   `Book.mp4`. Do not iterate blind.
3. If pacing is off: the inline seconds in `run()` (`stroke(drawPageL, 0.82)`
   etc. + the `nap()` holds) in `OpeningScene.tsx`.
4. If silhouette/proportions are off: the 5 path-string consts at the top of
   `OpeningScene.tsx` (`PAGE_L`, `PAGE_R`, `COVER_L`, `COVER_R`, `MARK`),
   viewBox 0–100, symmetric about x=50. Stroke width in `.opening__ink`.
5. If the user wants it themed (not black/white): `.opening { background }` +
   `.opening__ink { stroke }` in `OpeningScene.css`.
6. Breakpoint pass; live authed `/`.
7. `frontend/public/favicon.ico` still stale (optional, unrelated).
8. Whenever anything lands: **commit** + **update this file** (§4, §5, §9, §10).

---

## 12. Instructions for Future Claude Sessions

1. **Read this `CLAUDE.md` fully before doing anything.**
2. Current state = **uncommitted working tree**, parent `b7c5ddf`. The opening
   animation is a recreation of `Downloads/Book.mp4` (§2, §3). `git status` /
   `git diff` to see it. First action is to **commit** (§11 step 1).
3. The active objective is the **opening animation** (`src/components/intro/` —
   `OpeningGate.tsx`, `OpeningScene.tsx`, `OpeningScene.css`). Read them before
   editing. Every earlier opening (`IntroScene`, tear/flyer, geometric
   flat-part book, depth polish) is **gone** — ignore lingering mentions.
4. **Do not redo** anything in §3. Do not touch the backend, auth flow, Home,
   nav, Notes data model, Contact, About, or any existing section transition.
   Do not touch `NotesContext.tsx` / `Workspace.tsx` (Home first-load fix).
   framer-motion only — **no `three`/R3F**.
5. **Continue from §11.** Likely next input = a user verdict on how close the
   result is to `Book.mp4` — tune path consts + `run()` seconds, not architecture.
6. QA: `npm run dev -w frontend`, then Playwright `/login?introslow`, poll DOM
   state (§9). To inspect a reference video: §8 (scratchpad **range-capable**
   `node:http` server + `<video>` harness; clean up after).
7. Gates before every commit: `npx tsc -b`, `npx vitest run`, `npm run build`,
   `npx eslint .` (all in `frontend/`). Expect **64 tests**, 0 eslint errors, 6
   warnings. Commit messages: `feat/fix(cloudbook): …` + the `Co-Authored-By` /
   `Claude-Session` trailer.
8. **Update this file** whenever you make meaningful progress.
