# Bootstrap usage inventory

Snapshot at P1.1 (`8ec0849` + P1.1). Bootstrap 5.3.3 (CSS + JS bundle) and a
Font Awesome kit are loaded from CDN in `index.html`. This is the removal
checklist for P1.2–P1.5. **Do not remove Bootstrap until every row has a
replacement primitive and the app is not left half-migrated.**

## CDN dependencies (`index.html`)

| Resource | Purpose | Replace in |
|---|---|---|
| `bootstrap@5.3.3` CSS | all component + utility styling | P1.1 tokens → P1.3 primitives; drop link end of P1.3 |
| `bootstrap@5.3.3` JS bundle | navbar collapse, modal show/hide/dismiss, `.btn-close` | P1.3 (nav), P1.5 (modal) |
| `kit.fontawesome.com/...` JS | `fa-trash`, `fa-pen-to-square` icons in `NoteItem` | P1.4 — inline SVG icon set (`components/ui/Icon.tsx`) |

## JS-dependent behaviours (must become React-controlled)

| Where | Bootstrap mechanism | Replacement |
|---|---|---|
| `Navbar.tsx` | `data-bs-toggle="collapse"` + `.navbar-toggler` | P1.3 `TopNav` / `BottomNav`, React state; no hamburger unless justified |
| `Notes.tsx` | `data-bs-toggle="modal"`, `data-bs-dismiss="modal"`, `.btn-close`, hidden `d-none` trigger + `ref.click()` | P1.5 React-controlled `Modal` (focus trap, restore, Esc, animate-from-trigger); editing moves to the redesigned editor |
| `ThemeContext.tsx` | sets `data-bs-theme` | keeps setting it (compat) until Bootstrap CSS is gone, then drop |

## Class footprint (unique classes × occurrences)

Layout / grid: `container` (9), `container-fluid` (1), `row` (1), `col-md-3` (1)
Flex utils: `d-flex` (3), `align-items-center` (3), `justify-content-between` (1), `flex-wrap` (1), `gap-2` (3), `d-none` (1)
Spacing utils: `mb-3` (12), `my-3` (11), `mb-1` (5), `mt-3` (3), `px-0` (3), `px-2` (2), `mb-2` (2), `my-4/my-2/mx-1/mx-0/mt-4/mt-2/mb-0/py-3` (1 each)
Buttons: `btn` (13), `btn-primary` (8), `btn-sm` (4), `btn-link` (3), `btn-secondary` (1), `btn-outline-secondary` (1), `btn-close` (1)
Forms: `form-control` (12), `form-label` (9), `col-form-label` (3), `form-text` (2)
Nav: `nav` (1), `navbar` (1), `navbar-*` (brand/collapse/expand-lg/nav/toggler/toggler-icon, 1 each), `nav-item` (5), `nav-link` (2), `border-bottom` (1)
Card: `card`/`card-body`/`card-title`/`card-text` (1 each), `col-md-3` (1)
Modal: `modal`/`modal-dialog`/`modal-content`/`modal-header`/`modal-body`/`modal-footer`/`modal-title` (1 each), `fs-5` (1)
Alert: `alert` + `alert-${type}` + `alert-dismissible fade show` — `Alert.tsx` (→ `ToastRegion` in P1.3)
Text / misc: `text-secondary` (4), `text-bg-secondary` (1), `badge` (1), `h3` (2), `border-top` (2), `visually-hidden`(via `.sr-only` now)

## Per-file className density (migration order, lightest first)

`App.tsx` 1 · `Home.tsx` 0 · `Alert.tsx` 1 · `About.tsx` 2 · `Profile.tsx` 7 ·
`Footer.tsx` 8 · `Login.tsx` 11 · `NoteItem.tsx` 13 · `AddNote.tsx` 14 ·
`Navbar.tsx` 15 · `Signup.tsx` 17 · `Notes.tsx` 22

## Notes

- No Bootstrap grid beyond one `col-md-3` (the note grid) — the redesigned
  `NotesGrid` replaces it wholesale.
- `container` is the only layout primitive relied on for max-width + centering.
- The `Alert` slot (`role="alert"`, single reused node, 1.5 s auto-dismiss) is
  replaced by `ToastContext` + `ToastRegion` (`aria-live`, stack, manual
  dismiss) in P1.3.
