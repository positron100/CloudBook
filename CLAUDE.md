# CloudBook — Project Handoff (`CLAUDE.md`)

> **Read this first.** It is the living state of the frontend redesign. Treat the
> **Current Progress / Checkpoint** section as the truth about where work stopped.
> Inspect the referenced files before changing anything. Do not redo completed work.
> Update this file whenever significant progress is made.

Last updated: session ending at commit **`5153b63`** (branch `p0-foundation`).

Status legend used below: **[Verified]** = read/ran and confirmed · **[Partial]** =
built but not fully verified · **[Planned]** = not started · **[Assumed]** = believed
true, not re-checked this session.

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

**The signature opening animation** (`src/components/intro/`). On a fresh page
load / hard reload, CloudBook plays a one-time entrance: **a physical journal
opens → pages flip → one page tears from the binding → that page flies forward
and *becomes* the destination screen → a circular reveal opens the rest of the
UI around it.**

**Why:** establish CloudBook's identity immediately and make the whole app feel
like one physical paper system. The user supplied a **motion reference video**
(a looping "signing a cheque" icon) at
`C:\Users\DELL123\Videos\Screen Recordings\Screen Recording 2026-09-07 014231.mp4`
— used only for *motion quality* (anticipation, result-trails-driver,
acceleration/deceleration, one continuous motion, no reset between beats). They
also supplied recordings of the current implementation (`…021242.mp4`,
`…021337.mp4`).

**Expected end state:** watching the intro at normal speed, with no UI text, the
viewer reads: *"I see a book → it opens → pages flip → one page is selected →
it's still attached → it tears free → the exact page flies forward → it becomes
the screen I'm entering → the rest of the app reveals around it."* No blank
frame, no fade-to-nothing, no obvious component swap. Total ≈ 1.4–1.8 s. Works
for `notes`, `auth`, `contact`, `profile` destinations; resolves the destination
*before* rendering; skipped under reduced motion; never replays on internal
navigation.

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

### This session — the opening animation

**Commits (newest first):**

| Commit | What |
|---|---|
| `5153b63` | **Continuity fix.** Flight → destination handoff no longer a blank-page-then-mask-reveal. |
| `da6ce75` | Reworked choreography to the reference's motion rules (rest → open → flip·settle → select → tension → release → flight → settle → reveal). |
| `3efada9` | First implementation of the whole system (`IntroOrchestrator`, `IntroScene`, `introDestinations`, registry, book icon, `data-intro-target` attrs, `PointerEvent` polyfill, `NoteEditor` test-mode fold shortcut). |
| `522a976` | (pre-intro) final paper choreography pass on NoteEditor close + TearSheet. |
| `1a10c6e` | (pre-intro) ring-binding trace. |

**Files created:**

- `src/components/intro/IntroOrchestrator.tsx` — decides whether/what to run.
- `src/components/intro/IntroScene.tsx` — the choreography.
- `src/components/intro/IntroScene.css` — book / page / flyer visuals.
- `src/lib/introDestinations.ts` — `IntroDestination` type, registry, resolver.
- `src/lib/introDestinations.test.ts` — 6 resolver cases.

**Files modified:**

- `src/App.tsx` — `<IntroOrchestrator />` mounted under `<Router>`, sibling of
  `<RouteTransitionProvider>` (mounts once per document, never on nav).
- `src/components/ui/Icon.tsx` — `book` icon path replaced with a refined
  **open-journal** compound path (two leaves + spine + 4 rule lines), holds at
  18px, both themes. Old closed-book glyph gone.
- `src/components/auth/AuthCard.tsx` — `data-intro-target="auth"` on `.auth-stage`.
- `src/components/Profile.tsx` — `data-intro-target="profile"` on `.profile__card`.
- `src/components/workspace/TearSheet.tsx` — `EDGE_FLAT/NICK/HALF/TORN/SETTLE`
  clip polygons now **`export`ed** (reused by `IntroScene`). No behavior change.
- `src/components/workspace/NoteEditor.tsx` — `foldAway` now also shortcuts to
  `then()` immediately when `import.meta.env.MODE === "test"` (de-flake; the
  fold choreography is exercised in the browser, not jsdom).
- `src/components/workspace/NoteEditor.test.tsx` — `userEvent.setup({delay:null})`
  + `waitFor` timeout 4000 (de-flake under parallel load).
- `src/test/setup.ts` — `PointerEvent` aliased to `MouseEvent` when missing
  (framer v11's keyboard-press gesture constructs one; jsdom lacks it — this was
  causing intermittent whole-run failures).
- `src/styles/tokens.css` — `--z-intro: 2000` added.

**Key implementation decisions (this session):**

1. **The intro is a full-screen opaque overlay, the app renders underneath
   from frame 1 with the route already resolved.** So there is never a wrong
   destination shown. Rationale: simplest way to guarantee no wrong-frame; the
   app's own data can load behind the overlay.
2. **Destination resolved before `IntroScene` renders** — `IntroOrchestrator`
   runs `resolveIntroDestination(pathname, isAuthenticated)` in a `useEffect`,
   waiting at most **1 s** for `AuthContext.status` to leave `"loading"` (then
   assumes anonymous). Rationale: auth is the only fact that changes the
   destination; a stalled `/getuser` must not trap the user behind the book.
3. **No module-level "already played" flag.** `IntroOrchestrator` is a direct
   child of `<Router>`, *not* inside `<Routes>`, so it mounts once per document
   and its own `phase` state (`pending → playing → done`) stops replays on
   navigation. A full reload = fresh module + fresh mount = plays again. (An
   earlier module flag broke under React StrictMode's double-mount — removed.)
4. **The flyer BECOMES the destination via a paper dissolve, not a mask
   reveal.** (Commit `5153b63`, the core fix.) The flyer is a transform-only
   container (`.intro-flyer`, `z: calc(var(--z-intro) + 1)` — *above* the scene
   so the scene's reveal mask can't clip it) wrapping a `.intro-flyer__sheet`
   whose opacity (`fPaper` motion value) dissolves `1 → 0` in the last third of
   the flight. Simultaneously `data-revealing` flips ~58 % through the flight
   and `--reveal-r` is pre-set to a radius that already covers the destination
   rect — so the **real** destination surface (always rendered underneath at
   that rect) appears at the exact spot/instant the flyer's paper fades off it.
   Then the reveal circle grows out to the desk + nav. **No frame ever has no
   destination visible.** Previously the flyer landed as a blank ruled rectangle
   and the circular mask punched through to the real UI — that was the
   "component swap" the user rejected.
5. **Reuse the Notes tear language** — imports the exported `EDGE_*` polygons and
   the `--bind-*` binding-hole rhythm from the workspace so the intro is the same
   physical material system.
6. **`?introslow` URL param** multiplies the whole sequence ×6 (default ×1) so it
   can be traced. Kept as a permanent dev/QA aid (zero prod impact).
7. **Circular reveal = a `radial-gradient` mask** on `.intro-scene`, applied only
   while `data-revealing` (a zero-radius mask renders inconsistently across
   engines, so the layer is plainly opaque before that).

---

## 4. Current Implementation State

### Verified working

- **[Verified]** `resolveIntroDestination` — all branches covered by
  `introDestinations.test.ts` (6 cases): authed `/`→`notes`, anon `/`→`auth`,
  `/login|/register|/signup`→`auth`, `/about`→`contact`, `/profile`→`profile`
  (or `auth` if anon), trailing slashes tolerated, unknown paths safe.
- **[Verified]** Intro renders, plays and unmounts; `IntroOrchestrator` phase
  goes `pending → playing:<dest> → done`; no wrong frame (overlay covers all).
- **[Verified]** **No replay on internal navigation** (`/about → Home → /about`,
  `.intro-scene` never re-appears).
- **[Verified]** `/` (anonymous) → intro → Auth page visible + nav visible, no
  console errors.
- **[Verified]** `/about` → intro → the **continuity mechanism**: DOM trace at
  `?introslow` shows `data-revealing` flips mid-flight (fx≈164 of final 171),
  `--reveal-r` = 413 (covers the letter) *before* `fPaper` reaches 0,
  `.contact-letter__card` present the whole time, then `--reveal-r` grows
  413 → 1584 to the edges; scene unmounts. **No blank frame.**
- **[Verified]** Total duration ≈ **1.56 s** at 1× (measured from the ÷6 trace).
- **[Verified]** Book renders as a graphite journal (violet spine, ruled page,
  binding holes, base-cover thickness) in **both light and dark** (held-state
  screenshots).
- **[Verified]** Responsive: book fits and scene covers at **390** (book 286 px)
  and **1920** (book 305 px); `.intro-scene { overflow: hidden }`.
- **[Verified]** Reduced-motion path *by logic + CSS*: `IntroOrchestrator`
  initialises `phase = "done"` when `useReducedMotion()` is true → `IntroScene`
  never mounts; `@media (prefers-reduced-motion: reduce) { .intro-scene,
  .intro-flyer { display: none } }` backstop.
- **[Verified]** Gates green — see §9.

### Partially implemented / unverified

- **[Partial]** The **Notes** and **Profile** destination transformations. The
  mechanism is destination-agnostic (measure real rect → reform → dissolve →
  reveal) and the selectors exist (`.diary__page`, `[data-intro-target="profile"]`),
  but they were only frame-traced for `contact` and route-verified for `auth`.
  Notes/Profile need an **authenticated session** (a real JWT in `localStorage`)
  to see live. Resolver + selectors are unit-/inspection-verified.
- **[Partial]** The **page-flip** visual. Three `pfN` `rotateY` sheets flip with
  settles and per-page offsets/`::after` light sweep, but "do I clearly see 3
  distinct sheets turning" was not visually confirmed at normal speed (Playwright
  can't capture mid-intro frames — see §10).
- **[Partial]** The **reference's "hold" discipline**. Holds were trimmed
  aggressively (rest 70 ms, no post-open hold, flip-settles 42 ms, select 90 ms)
  to hit the 1.4–1.8 s budget. Whether the result still reads as "deliberate,
  physical, one continuous story" vs "rushed" is a normal-speed judgement call
  the user must make on a new recording.

### Not done / planned

- **[Planned]** A user-visible recording of the *current* build for QA (§42 of
  the brief). Not producible in this harness.
- **[Planned]** Browser `favicon.ico` (a binary asset) has NOT been regenerated
  to match the new `book` icon — only the in-app SVG `Icon` was updated.
- **[Planned]** Individual screenshots at every listed breakpoint (360/430/1024/
  1280/1600). Layout is intrinsically fluid (`clamp()` + `72vw` under 400px,
  live-viewport reveal maths) so this is low-risk, but not done.

---

## 5. Current Progress / Checkpoint

**Where work stopped:** commit **`5153b63`** — the continuity fix landed and is
verified via DOM trace. All gates green. The working tree is **clean** (`git
status` empty).

**Last completed step:** rebuilt `IntroScene`'s flight→destination handoff so the
flyer's *paper* dissolves onto the real destination surface (rendered underneath
at the measured rect) while the circular reveal opens — eliminating the blank
ruled rectangle and the mask-punch "component swap". Trimmed all holds to land
≈ 1.56 s. Bumped page-stack offsets + added a leading-edge light sweep so the
flips read as separate sheets. Committed. Verified: `/` → Auth and `/about` →
Contact both complete correctly, `--reveal-r` covers the destination before
`fPaper` hits 0, no replay on nav, 70 tests / tsc / build / eslint green.

**There is no unfinished in-flight edit.** The intro system is complete and
committed; the remaining work is *iteration on feel* driven by a new recording
from the user, plus the unverified items in §4.

**What the next step should be:** wait for the user's next recording of the
current build (`5153b63`) and their verdict. Likely follow-ups, in order of
probability:
1. If it still feels rushed/disconnected → re-add small holds and/or slow the
   flight, and make the flip sheets more visibly distinct (bigger offsets,
   stronger per-sheet shadow/tint).
2. If the book doesn't read as a real object → more material on the cover
   (bevel, page-block thickness at the bottom edge, a visible spine coil), a
   slightly bigger book, a subtle desk-light pool.
3. If the paper→destination dissolve is detectable → tune `fPaper` timing vs
   `--reveal-r` onset; consider a short cross-scale where the flyer's rules fade
   as the destination content fades in.
4. Verify Notes + Profile live with a real login.

---

## 6. Files & Code Locations

### The opening animation (the current focus)

| Path | Responsible for |
|---|---|
| `src/components/intro/IntroOrchestrator.tsx` | Gate + resolve. `DISABLED = import.meta.env.MODE === "test"`. `phase` state machine `pending → playing → done`. `useEffect` resolves `destRef.current = resolveIntroDestination(pathname, isAuthenticated)` (waits ≤1 s on `status === "loading"`). Renders `<IntroScene>` only when `phase === "playing"`. |
| `src/components/intro/IntroScene.tsx` | The choreography. `useEffect` runs an async `run()`. Motion values: book (`bookY/bookScale/bookFade/coverRot/pf0/pf1/pf2/chosenLift/chosenGlow`), flyer (`fOpacity` [element], `fPaper` [`.intro-flyer__sheet` only], `fx/fy/fsx/fsy/frot/fskew/fclip/flift/bindT`), reveal (`revealR` + `revealing` state + `center` state). `TS` = `?introslow` ? 6 : 1; `nap(ms)` = `sleep(ms*TS)`. `run()` phases 1–8 (see comments). Renders a `<>` fragment: `.intro-scene` (opaque, book) + `.intro-flyer` **sibling** (higher z). `finish()` (guarded by `doneRef`) → `onDone()`. Safety `cap` = 5 s; Escape / pointerdown = `skip()` (fast reveal). |
| `src/components/intro/IntroScene.css` | `.intro-scene` (fixed, `z-index: var(--z-intro)`, opaque radial desk-light bg, `--intro-board*` graphite tokens w/ dark override, `[data-revealing]` applies the `radial-gradient` mask driven by `--reveal-r`/`--reveal-cx`/`--reveal-cy`). `.intro-book` (perspective, `clamp(196px,46vw,300px)`, `72vw` <400px). `.intro-book__base` (hardcover back board + `::after` spine). `.intro-book__page` (stack, `::after` light sweep). `.intro-book__cover` + `::before` (violet edge) + `.intro-book__mark` (the Icon). `.intro-page__rules` / `.intro-page__binding` (mirror `.note-card__binding`). `.intro-flyer` (transform container, `z: calc(var(--z-intro)+1)`) + `.intro-flyer__sheet` (the paper, opacity = inline `fPaper`). Reduced-motion `display:none`. |
| `src/lib/introDestinations.ts` | `type IntroDestination = "notes"\|"auth"\|"contact"\|"profile"`. `introDestinations` registry `{ selector, label }`. `resolveIntroDestination(pathname, isAuthenticated)`. |
| `src/lib/introDestinations.test.ts` | 6 resolver cases. |

### Destination-surface markers (so the flyer can measure them)

- `notes` → `.diary__page` (in `Notebook.tsx`, always rendered on `/`).
- `auth` → `[data-intro-target="auth"]` (on `.auth-stage` in `AuthCard.tsx`).
- `contact` → `.contact-letter__card` (in `ContactLetter.tsx`).
- `profile` → `[data-intro-target="profile"]` (on `.profile__card` in `Profile.tsx`).

### App shell / routing

| Path | Responsible for |
|---|---|
| `src/App.tsx` | Provider tree + `<Routes>` + `<IntroOrchestrator />` (under `<Router>`, after `</RouteTransitionProvider>`). `<LazyMotion features={domMax} strict>`. |
| `src/main.tsx` | Root render, imports `styles/fonts.css` + `tokens.css` + `global.css`. |
| `src/components/layout/AppShell.tsx` | Skip link, `DeskBackdrop`, `TopNav`, `<main>` wrapping `RouteTransitionStage`, `BottomNav`, `ToastRegion`. |
| `src/components/transitions/RouteTransition.tsx` | `RouteTransitionProvider` + `useRouteTransition().transitionTo(path)` — soft spatial dissolve on internal nav (NOT the intro). Skips between the two auth modes. |
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
| Intro = opaque full-screen overlay above the real app | Render the intro *inside* the routed page; a portal per destination | Overlay guarantees no wrong-destination frame with zero coupling to each page's internals; the app + its data load behind it. |
| Resolve destination in `IntroOrchestrator` before `IntroScene` renders, wait ≤1 s on auth | Start the intro immediately, correct mid-flight | Brief §3/§21/§32 forbid a visible destination switch. Auth is the only variable; 1 s cap avoids a deadlock on a slow `/getuser`. |
| No module "already played" flag; rely on component state + mount position | `sessionStorage`; a module `let` | The module flag broke under React StrictMode's mount→unmount→mount (the 2nd mount's `useState` initializer read the flag as already-consumed). `IntroOrchestrator` outside `<Routes>` never remounts on nav, so state is enough. Reload = fresh module anyway. |
| **Flyer paper dissolves onto the real destination** (`fPaper` 1→0) while the reveal opens already covering the destination rect | Keep the mask-only reveal; a framer `layoutId` shared-element transition between the flyer and the real surface; render destination content *inside* the flyer | `layoutId` needs the same element type/tree — the flyer (a paper div) and e.g. `.auth-stage` are unrelated. Rendering real content inside the flyer means re-mounting each destination twice. The dissolve is the cheapest way to make "the page *is* the surface" true: they are pixel-aligned (same measured rect), same paper family, and the real one is already there — fading the flyer's paper reveals it with no swap. |
| Flyer is a **sibling** of `.intro-scene` at `z: var(--z-intro)+1` | Flyer inside `.intro-scene` | The scene's reveal mask (`circle(r)` hole) would also clip the flyer — the page would vanish inside the growing hole. Sibling + higher z keeps the flyer painting over everything until it dissolves. |
| Reuse `EDGE_*` polygons + `--bind-*` tokens from the workspace | A separate tear implementation for the intro | Brief §11/§16/§40 — the intro must be the same physical material system as Notes. Exporting the constants is a no-op change to `TearSheet`. |
| `?introslow` (×6) kept permanently as a dev aid | Remove after QA; a `window.__` global | It's guarded (`URLSearchParams`, default ×1), documented, zero prod cost, and the *only* way to observe the sequence given Playwright's rAF throttling. |
| `PointerEvent = MouseEvent` in `test/setup.ts` | Ignore the intermittent failures; pin an older framer | framer v11's keyboard press-gesture (`Enter`/`Space` on a `whileTap` element) constructs a `PointerEvent`; jsdom lacks it → an uncaught exception occasionally failed an unrelated test. The alias is harmless (jsdom `MouseEvent` covers what framer reads). |
| `NoteEditor.foldAway` shortcuts under `MODE === "test"` | Longer `waitFor`; fake timers | The fold is ~700 ms of framer animation; under parallel jsdom load it starved rAF and blew even a 2.5 s `waitFor`. The test verifies the *contract* (`onSave`/`onClose` called), not the animation — which is covered in the browser. |
| Book icon = open-journal compound path | Keep the closed-book glyph; a multi-`<path>` Icon variant | `Icon` renders one `<path>`; a compound `d` avoids changing the component. Open journal ties to the intro book (§28/§29). |

---

## 8. Dependencies / Integration Points

- **Backend API** — `https://cloud-book-backend.onrender.com` (Render). Frontend
  reads `VITE_API_URL` (see `frontend/.env` / vite env; tests stub it to
  `http://test.local`). JWT in **`auth-token`** header, stored in `localStorage`
  key `token` (`src/lib/auth.ts`). Endpoints: see §6 / `shared/types` `API_ROUTES`.
  **The intro only reads `AuthContext.status`/`isAuthenticated` and
  `useLocation().pathname` — it makes no API calls.**
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
- **Reference / QA assets** (not in repo) — the user's screen recordings in
  `C:\Users\DELL123\Videos\Screen Recordings\`. To inspect a video: copy it into
  `frontend/public/` temporarily, serve via the running dev server, load it in
  the Playwright browser in a tiny `<video>` harness page, seek + screenshot,
  then **delete the copy and the harness** (they are `.gitignore`-safe only if
  named to match `**/audit/` etc. — `_*.mp4`/`_*.html` in `public/` are NOT
  ignored, so remove them).

---

## 9. Testing & Verification

**Ran this session (at `5153b63`):**

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc -b` (in `frontend/`) | **clean** |
| Unit | `npx vitest run` | **70 passed / 14 files** |
| Lint | `npx eslint .` | **0 errors**, 6 pre-existing `react-refresh/only-export-components` warnings (context files — known, benign) |
| Build | `npm run build` | **clean** — `dist/assets/index-*.css` 13.59 KB gz, `index-*.js` 65.31 KB gz, `vendor-react` 53.57 KB gz |

New tests: `src/lib/introDestinations.test.ts` (6 cases, all passing).

**Manual / Playwright verification (this session):**

- Intro DOM trace at `/about?introslow` — full ordered choreography; the
  continuity invariant holds (`--reveal-r` covers the destination before
  `fPaper` = 0; `.contact-letter__card` present throughout). ≈ 1.56 s at 1×.
- `/` (anon) → intro completes → Auth + nav visible, no console errors.
- `/about → Home → /about` → intro does **not** replay.
- Book held-state screenshots — reads as a graphite journal, both themes.
- Book fits + scene covers at 390 and 1920.

**Still needs testing:**

1. **Notes** and **Profile** destinations *live* (need a real login / JWT).
2. The intro *at normal speed on a real screen* — flip legibility, whether the
   paper→destination dissolve is detectable, whether the trimmed timing reads as
   deliberate vs rushed. **This is the user's call from a new recording.**
3. Breakpoints 360 / 430 / 1024 / 1280 / 1600.
4. Reduced-motion in a real browser with the OS setting on (only logic-verified).
5. Deep links (`/profile`, `#`-style) with the intro.

**Known Playwright limitation:** `browser_take_screenshot` waits for
animation-idle and times out mid-intro; Playwright throttles `requestAnimationFrame`
under CDP. Mid-animation frames are therefore captured only via DOM
motion-value sampling (`?introslow` + a `getComputedStyle`/`DOMMatrix` poll loop)
or via a temporary "hold" debug branch. There is no way to produce a real
recording of the animation from this harness.

---

## 10. Known Issues / Risks

- **[Risk] `?introslow` is lost on the `/`→`/login` redirect** (`RequireAuth`
  drops the query string). So you cannot slow-trace the *auth-destination* intro
  by loading `/?introslow`; use `/about?introslow` (contact) or add a real token
  and use `/?introslow` while authenticated, or temporarily read the flag from
  `sessionStorage` instead.
- **[Risk] The book is visually dim in dark mode** — graphite-on-near-black. It
  reads, but has low contrast. A desk-light pool + more cover material would help.
- **[Limitation] The cover swings fully away on open** rather than remaining
  visible as an opened board. Acceptable but not maximally "book".
- **[Limitation] Page-flip legibility unconfirmed** at normal speed.
- **[Risk] `data-revealing` applies the mask instantly at radius ≈ 413** — a
  large circle appears in one frame. It's masked by the still-mostly-opaque
  flyer paper at that instant, but on a slow machine where framer stalls it
  could pop. Consider animating `--reveal-r` from a smaller value at mask-on.
- **[Risk] `fallbackRect`** — if a destination selector never matches within
  ~630 ms, the flyer reforms to a generic centred rect and the reveal centres on
  the viewport. Only the 5 s `cap` then guarantees the user isn't stuck. All
  four real selectors render synchronously today, so this is a safety net only.
- **[Pre-existing flake, mitigated] `NoteEditor.test.tsx`** — was ~50 % flaky
  under full-suite parallel load (rAF starvation + `userEvent` per-keystroke
  delay + a cross-file `PointerEvent` uncaught exception). Fixed via
  `userEvent.setup({delay:null})` + `MODE==="test"` fold shortcut + the
  `PointerEvent` polyfill. Verified 5/5 clean full runs. If it recurs, the
  polyfill or the shortcut is the place to look.
- **[Pre-existing] `SortMenu.test.tsx`** sometimes logs an `Unhandled Errors: 1`
  line (a post-test async teardown in framer) without failing — cosmetic, ignore.
- **[Unverified assumption] Auth/Notes/Contact/Profile pages still render their
  `data-intro-target` / class markers.** Verified for `auth` (`.auth-stage`) and
  `contact` (`.contact-letter__card`) this session; `notes` (`.diary__page`) and
  `profile` (`.profile__card` + attr) assumed from code inspection.
- **[Do not regress]** Everything in §3 "Prior sessions" — auth flow, Home, nav
  structure, Notes data model, optimistic mutations, Contact, About, reduced
  motion, dark mode, the RouteTransition dissolve, the theme reveal. The intro
  must not replace any existing section transition.

---

## 11. Next Steps (ordered, actionable)

1. **Get the user's verdict** on a fresh recording of `5153b63`. Do not iterate
   blind.
2. If "still feels like separate screens / rushed": in `IntroScene.tsx` `run()`
   — restore ~40–60 ms to the flip settles and the select hold; slow the flight
   `D` from `0.44` to ~`0.52`; verify total stays ≤ ~1.9 s via `?introslow` trace.
3. If "pages don't visibly flip": in `IntroScene.tsx` bump `PAGE_REST` offsets
   again (e.g. `x: 6/12/18`), and in `IntroScene.css` give `.intro-book__page`
   distinct per-child shadows / a hair of tint difference so 3 sheets read.
4. If "book isn't a real object": `IntroScene.css` — add a `.intro-book__base`
   bottom-edge page-block, a cover bevel/emboss, widen the spine, add a soft
   radial desk-light already present but subtle. Consider `clamp(220px,52vw,340px)`.
5. If "the dissolve is detectable": tune the `window.setTimeout(… , D*580)`
   onset and the `fPaper` `D*0.36` duration in `run()` phase 7; try starting
   `--reveal-r` smaller and animating it up as the mask turns on.
6. **Verify Notes + Profile live** — log in (real backend), reload `/` and
   `/profile`, watch the intro reform onto `.diary__page` / `.profile__card`.
7. Run the breakpoint pass (360/430/1024/1280/1600) — book centred, no clip.
8. Regenerate `frontend/public/favicon.ico` from the new open-journal mark
   (optional, low priority).
9. Whenever any of the above lands: **commit** (with the trailer) and **update
   this file** (§4, §5, §9, §10).

---

## 12. Instructions for Future Claude Sessions

1. **Read this `CLAUDE.md` fully before doing anything.**
2. Treat commit **`5153b63`** and the **Checkpoint (§5)** as the current state.
   `git log --oneline -10` and `git status` to confirm nothing moved.
3. The active objective is the **opening animation** (`src/components/intro/`).
   Read `IntroOrchestrator.tsx`, `IntroScene.tsx`, `IntroScene.css`,
   `introDestinations.ts` **before editing** — the choreography is subtle and
   the continuity invariant (§7, decision 4) is easy to break.
4. **Do not redo** anything in §3. Do not touch the backend, the auth flow,
   Home, nav structure, the Notes data model, Contact, About, or any existing
   section transition. Do not add another animation library (framer-motion only).
5. **Continue from §11.** The likely next input is a new user recording +
   verdict — wait for it, then iterate on *feel*, not architecture.
6. To QA the animation: `npm run dev -w frontend`, then in the Playwright
   browser load `http://localhost:<port>/about?introslow` and poll DOM
   motion-value state (see §9 / the trace approach). Screenshots can only
   capture the final state or a temporary "hold" debug branch. To inspect a
   user video, use the temp-copy-into-`public/` + `<video>` harness approach
   (§8) and **clean up after**.
7. Gates before every commit: `npx tsc -b`, `npx vitest run`, `npm run build`,
   `npx eslint .` (all in `frontend/`). Expect 70 tests, 0 eslint errors, 6
   warnings. Commit messages: `feat/fix(cloudbook): …` + the
   `Co-Authored-By` / `Claude-Session` trailer.
8. **Update this file** (§4 status flags, §5 checkpoint, §9 results, §10 issues,
   §11 next steps) whenever you make meaningful progress, so the next session
   starts clean.
