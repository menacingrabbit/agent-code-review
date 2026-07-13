# agent-code-review

Eine **eigenständige, wiederverwendbare GitHub Action**, die einen PR-Diff holt,
ihn an ein LLM via [OpenRouter](https://openrouter.ai) schickt und die Review als
**einen einzelnen Zusammenfassungs-Kommentar** unter den PR postet.

- Stack: TypeScript / Node.js (Node 20), `@actions/core` + `@actions/github` (Octokit), gebündelt mit `@vercel/ncc`.
- Default-Modell: `tencent/hy3:free` (kostenlos), per Input `model` überschreibbar.
- Kommentar-Stil: ein einzelner PR-Kommentar (keine Inline-/Zeilen-Kommentare).

## Nutzung im Ziel-Repo

Workflow-Datei anlegen, z. B. `.github/workflows/code-review.yml`:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write   # zum Posten des Kommentars
      contents: read
    steps:
      - uses: <owner>/agent-code-review@main
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          # model: tencent/hy3:free          # optional
          # max-diff-chars: "60000"           # optional
          # prompt-extra: "Focus on security" # optional
```

Setze das Repository-Secret `OPENROUTER_API_KEY` (unter *Settings → Secrets and variables → Actions*).
Der `GITHUB_TOKEN` wird automatisch aus `github.token` gezogen (Input `github-token` mit Default).

## Inputs

| Input | Required | Default | Beschreibung |
| --- | --- | --- | --- |
| `openrouter-api-key` | ja | – | OpenRouter API-Key. |
| `github-token` | nein | `${{ github.token }}` | Token für Diff/Comment. |
| `model` | nein | `tencent/hy3:free` | OpenRouter-Modell-ID. |
| `max-diff-chars` | nein | `60000` | Diff wird darüber gekürzt. |
| `prompt-extra` | nein | `""` | Zusätzliche Reviewer-Anweisungen. |

## Entwicklung

```bash
npm install        # Dependencies installieren
npm run typecheck  # Typcheck (tsc --noEmit)
npm run build      # ncc bundle -> dist/index.js
```

`dist/` wird **committet** (die Action läuft `dist/index.js`). Nach jeder Änderung
an `src/` muss `npm run build` ausgeführt und das Ergebnis committet werden.

### Lokaler Smoke-Test (optional)

OpenRouter-Anbindung ohne GitHub prüfen — kleines Script, das `reviewDiff`
aus `src/openrouter.ts` mit einem Beispiel-Diff und dem Key aus
`process.env.OPENROUTER_API_KEY` aufruft und das JSON loggt.
