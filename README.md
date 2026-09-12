# CloudBook

CloudBook is a personal cloud-based note-taking app built as **"the Lit
Desk"** — a warm, physical writing-desk environment (paper notes, a ring-bound
diary, a floating frosted-glass UI, and an ambient field of drifting
architectural blocks behind it all) rather than a generic dashboard.

## Features

- **User authentication** — sign up, log in, JWT-backed sessions.
- **Note management** — create, view, edit, tag, and delete notes, with
  optimistic UI (a note appears/updates/disappears instantly, then
  reconciles with the server).
- **Search, tag filter, sort** — notes reflow into place rather than the
  list being swapped.
- **Physical motion** — notes tear off the diary page and land in the pile
  on create, fold open into a full page to edit, and fold back to a card on
  close; deleting one returns it to the notebook.
- **Ambient glass environment** — a shared frosted-glass system (nav,
  search, tag/sort, dropdowns) in front of a continuously flying field of
  blocks that gently reorganizes while you type.
- **Light/dark themes**, **reduced-motion support**, keyboard-accessible
  throughout.

## Monorepo layout

```
CloudBook/
├─ frontend/      Vite + React 18 + TypeScript SPA. Deploys to Vercel.
├─ backend/       Express + Mongoose API. Deploys to Render.
└─ shared/types/  The frontend↔backend contract (entities, API routes).
```

## Technologies used

- **Frontend**: React 18, TypeScript, Vite, `framer-motion`, React Router,
  Vitest + Testing Library. No CSS framework — hand-written CSS on design
  tokens (`frontend/src/styles/tokens.css`).
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth.
- **Contact form**: a small Vercel function (`frontend/api/`) backed by
  Resend.

## Setup

1. Clone the repository: `git clone <repository-url>` and `cd CloudBook`.
2. Install dependencies once at the repo root (this is an npm workspaces
   monorepo, so one install covers `frontend/` and `backend/`):
   ```
   npm install
   ```
3. Backend environment — create `backend/.env` (see `backend/.env.example`):
   ```
   MONGO_URI=<your-mongodb-uri>
   JWT_SECRET=<your-jwt-secret>
   ```
4. Frontend environment — create `frontend/.env` (see
   `frontend/.env.example`):
   ```
   VITE_API_URL=http://localhost:5000
   ```
   (point this at your deployed backend instead, e.g.
   `https://cloud-book-backend.onrender.com`, to use CloudBook without
   running a local backend.)
5. Run both dev servers together from the repo root:
   ```
   npm run dev
   ```
   Frontend: `http://localhost:5173` (Vite picks the next open port if
   busy). Backend: `http://localhost:5000`.

   Or run one side only: `npm run dev -w frontend` / `npm run dev -w backend`.

Other root-level scripts: `npm run build` (frontend production build),
`npm test` (frontend unit tests), `npm run lint`.

## API endpoints

JWT is sent in the **`auth-token`** header (not `Authorization`).

### Authentication
- **POST /api/auth/createuser** — create a new user.
- **POST /api/auth/login** — log in with existing credentials.
- **POST /api/auth/getuser** — fetch the authenticated user (rehydration).

### Notes
- **GET /api/notes/fetchallnotes** — fetch all notes of the authenticated user.
- **POST /api/notes/addnote** — add a new note.
- **PUT /api/notes/updatenote/:id** — update an existing note by ID.
- **DELETE /api/notes/deletenote/:id** — delete a note by ID.

The exact route strings and response shapes live in
`shared/types/index.ts` — that file is the source of truth for the
frontend↔backend contract.

## Database schema

```javascript
const NoteSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "user" },
  title: { type: String, required: true },
  description: { type: String, required: true },
  tag: { type: String, default: "General" },
  date: { type: Date, default: Date.now },
});
```

## Contributors

- Mukul Negi

Feel free to contribute, report issues, or suggest improvements. Happy
note-taking with CloudBook! 📝🌥️
