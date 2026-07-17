# agent-code-review

Eine **eigenständige, wiederverwendbare GitHub Action** (dieses Repo ist **public**),
die einen PR-Diff holt, ihn an ein LLM via [OpenRouter](https://openrouter.ai) schickt
und die Review bei jedem Lauf als **neuen Zusammenfassungs-Kommentar** unter den PR postet,
sodass die vollständige Review-History erhalten bleibt. Frühere Reviews werden dabei als
Kontext einbezogen, sodass bereits behandelte Punkte nicht wiederholt und Korrekturen als
erledigt anerkannt werden.

- Stack: TypeScript / Node.js (Node 20), `@actions/core` + `@actions/github` (Octokit), gebündelt mit `@vercel/ncc`.
- Default-Modell: `tencent/hy3:free` (kostenlos), per Input `model` überschreibbar (z. B. `anthropic/claude-3.5-sonnet`).
- Kommentar-Stil: bei jedem Lauf ein **neuer** PR-Kommentar (volle History bleibt erhalten; keine Inline-/Zeilen-Kommentare). Der letzte Kommentar wird bei neuen Commits nicht überschrieben.
- Konsumiert wird sie normal über `uses: menacingrabbit/agent-code-review@main` — kein Token/Checkout nötig.

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
      - uses: menacingrabbit/agent-code-review@main
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          # model: tencent/hy3:free          # optional
          # max-diff-chars: "60000"           # optional
          # prompt-extra: "Focus on security" # optional
```

Setze das Repository-Secret `OPENROUTER_API_KEY` (Ziel-Repo → *Settings → Secrets and variables → Actions*).
Der `GITHUB_TOKEN` wird automatisch aus `github.token` gezogen (Input `github-token` mit Default).

## Inputs

| Input | Required | Default | Beschreibung |
| --- | --- | --- | --- |
| `openrouter-api-key` | ja | – | OpenRouter API-Key (als GitHub-Secret). |
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

OpenRouter-Anbindung ohne GitHub prüfen: `src/openrouter.ts` hat keine Projekt-Imports,
kann also einzeln kompiliert und `reviewDiff()` mit einem Beispiel-Diff aufgerufen werden:

```bash
npx tsc src/openrouter.ts --outDir .smoke --module commonjs --target es2022 --skipLibCheck --esModuleInterop
# danach ein kleines Script, das reviewDiff({ apiKey, model, diff, maxDiffChars, promptExtra })
# mit dem Key aus process.env.OPENROUTER_API_KEY (oder .claude/settings.json) aufruft.
rm -rf .smoke
```

## Sicherheit

- Der OpenRouter-Key kommt **nie** im Klartext ins Repo — nur als GitHub-Secret (`secrets.OPENROUTER_API_KEY`).
- `.claude/` ist via `.gitignore` ausgeschlossen, weil `settings.json` lokal einen Key enthalten kann.
