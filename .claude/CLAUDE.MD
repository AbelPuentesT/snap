# CLAUDE.md — Claude Code configuration (`.claude/`)

Guidance for working inside `.claude/`, the Claude Code configuration directory for this repo.

## Contents

- `rules/api-design.md` — REST conventions: URL/method/status-code rules, camelCase request/response fields, Spanish error messages, Bearer auth format, user-scoped query pattern.
- `rules/security.md` — JWT auth (HS256, 24h expiry, no revocation), bcrypt hashing, SQL injection/XSS prevention, user isolation, secrets handling, dev vs. production error detail.
- `rules/testing.md` — vitest integration-test conventions: real Express app + real SQLite db per suite, `SNAP_DB_NAME` isolation, throwaway auth users, naming conventions.
- `settings.local.json` — machine-local Claude Code settings (permissions, etc.); gitignored globally, not shared with the team.

## Maintaining these rules

The three `rules/*.md` files are the source of truth for backend conventions in this repo — the root `../CLAUDE.md` covers architecture and module layout, while these cover *how* to write a new endpoint, secure it, and test it. Keep them consistent with each other and with the actual code in `src/`:

- If a rule contradicts what the code actually does, trust the code and update the rule — these files should never describe a convention the codebase abandoned.
- New rule files go in `rules/` (one topic per file, e.g. `rules/logging.md`), not appended to this index. Add a one-line entry here pointing to it when you do.
- Don't duplicate content from the root `CLAUDE.md` or `client/CLAUDE.md` here — link the concept instead of copying it, so there's a single place to update it.
