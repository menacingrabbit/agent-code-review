# CLAUDE.md

Wiederverwendbare GitHub Action: AI-Code-Review eines PR-Diffs via OpenRouter, gepostet als einzelner PR-Kommentar. Dieses Repo ist **public**; Konsum im Ziel-Repo über `uses: menacingrabbit/agent-code-review@main`.

## Stack
- TypeScript / Node 20, gebündelt mit `@vercel/ncc` in **`dist/index.js`** (committet).
- Runtime-Deps: `@actions/core`, `@actions/github` (Octokit). Kein HTTP-SDK — OpenRouter wird via natives `fetch` angesprochen.

## Struktur (`src/`)
- `index.ts` — Orchestrierung: Inputs lesen, Octokit+Context, Diff holen, Review holen, Kommentar posten.
- `github.ts` — `getPrDiff` (roher Diff via `mediaType: diff`); `findPreviousReviewComment` + `upsertReviewComment` (marker-basiert: ein einzelner, bei Push aktualisierter Kommentar statt Kommentar-Flut).
- `openrouter.ts` — `reviewDiff`: baut Prompt, ruft `https://openrouter.ai/api/v1/chat/completions`, parst JSON (`{summary}`), defensiver Fallback bei Parse-Fehler.

## Wichtigste Konventionen
- **`dist/` muss nach jeder Änderung an `src/` neu gebaut UND committet werden** (`npm run build`). Die Action läuft aus `dist/`, nicht aus `src/`.
- Build/Verifikation: `npm run typecheck` (sauber) → `npm run build`.
- Default-Modell `tencent/hy3:free`, überschreibbar via Input `model`.
- Kommentar-Stil: ein einzelner, sich weiterentwickelnder PR-Kommentar (kein Kommentar-Flut bei jedem Push).
- Prompt liegt in `src/openrouter.ts`: `SYSTEM_PROMPT` (fest) + `buildUserPrompt()` (Diff + `prompt-extra`).
- `action.yml` (`node20`, Inputs, `main: dist/index.js`) ist die Action-Definition.

## Änderungen
- Prompt/Logik → `src/*.ts` bearbeiten, dann `npm run build`, `dist/` committen + pushen.
- Modell-Default → `action.yml` (`model.default`) **und** `src/index.ts` (`|| 'tencent/hy3:free'`) zusammen ändern.

## Sicherheit
- OpenRouter-Key nur als GitHub-Secret (`secrets.OPENROUTER_API_KEY`), nie im Klartext.
- `.claude/` ist gitignored (lokales `settings.json` kann einen Key enthalten).

## Testen
- Smoke: `src/openrouter.ts` einzeln kompilieren (`npx tsc src/openrouter.ts --outDir .smoke ...`) und `reviewDiff()` mit Beispiel-Diff aufrufen.
- Echt: im Ziel-Repo Secret setzen + PR öffnen → Kommentar erscheint.
