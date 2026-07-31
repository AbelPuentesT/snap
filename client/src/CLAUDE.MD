# CLAUDE.md — Frontend source conventions (`client/src/`)

This file covers coding conventions *inside* `client/src/`. For directory layout, commands, and the overall frontend architecture, see `../CLAUDE.md` one level up — don't duplicate that here.

## Component conventions

- Function components, `export default function ComponentName() { ... }` — see `components/ProtectedRoute.tsx` for the minimal shape.
- No CSS modules or styled-components: styling is global CSS variables defined once in `index.css` (`--bg`, `--border`, `--accent`, `--text-muted`, `--radius`, etc.) and applied via plain class names. Reuse an existing variable before introducing a new color/spacing value.
- Pages live in `pages/`, reusable chrome (nav, route guards) lives in `components/`, cross-cutting state lives in `hooks/`. A new screen is a `pages/*.tsx` file wired into `App.tsx`'s router, not a new top-level directory.

## State and data

- Server state is not cached client-side beyond what a component's own `useState`/`useEffect` holds — there's no React Query/SWR layer. Fetch in the page that needs the data.
- Auth state (`user`, `token`) comes from `useAuth()` (`hooks/useAuth.tsx`) — never read `localStorage` directly in a component; go through the hook so login/logout/401-redirect stay consistent.
- All HTTP calls go through the typed helpers in `api/*.ts`, which call the shared `api<T>()` wrapper in `api/client.ts`. Don't call `fetch()` directly from a component — add a function to the relevant `api/*.ts` file instead, even for a one-off call.

## TypeScript

- Strict mode is on; avoid `any`. Model API responses as interfaces near the `api/*.ts` function that returns them (see `api/dashboard.ts` for the pattern of exporting both the fetch function and its response type).
- Props types are inlined (`{ children }: { children: ReactNode }`) for small components rather than named `interface FooProps` unless the component has several props worth documenting together.

## Errors and messages

- Errors thrown by `api()` carry the backend's Spanish message (`ApiRequestError`). Render `error.message` directly to the user — don't re-translate or rephrase it, so it stays consistent with the backend's error strings documented in `docs/API.md`.
- Form-level validation errors (e.g. empty field before submit) should also read naturally in Spanish, matching the backend's tone, even though nothing enforces this client-side today.
