# Say It Like You — Thoughts → Content MVP

A local-first validation MVP for one question: can AI turn a rough spoken thought into publishable content **without sanding off the speaker's voice?**

The complete loop is implemented: record or paste → transcribe (when configured) → generate for five formats → compare source and result → copy/export → persist authenticity feedback to SQLite.

## Quick start

Requirements: Node 22+, Python 3.11+, and [`uv`](https://docs.astral.sh/uv/).

```bash
cp .env.example .env
# Add DEEPSEEK_API_KEY to .env
./dev.sh
```

Open <http://localhost:5173>. API docs are at <http://localhost:8000/docs>.

In the director workspace, the backend also reads `/mnt/d/hermes-agents/director/hermes-home/.env` when no project-local value exists. The key is never copied into this repository.

Manual start, if preferred:

```bash
cd server && uv sync && uv run uvicorn app.main:app --reload
# second terminal
npm --prefix web install && npm --prefix web run dev
```

Docker is also supported:

```bash
cp .env.example .env
# Add credentials, then:
docker compose up --build
```

## Environment

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `DEEPSEEK_API_KEY` | Yes | — | Content generation |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com/v1` | OpenAI-compatible chat endpoint |
| `DEEPSEEK_MODEL` | No | `deepseek-v4-flash-vision-exp` | Generation model |
| `STT_API_KEY` | Only for recording | — | OpenAI-compatible transcription key |
| `STT_BASE_URL` | No | `https://api.openai.com/v1` | `/audio/transcriptions` provider |
| `STT_MODEL` | No | `whisper-1` | Speech-to-text model |
| `DATABASE_PATH` | No | `data/thoughts.db` | SQLite file |
| `VITE_API_URL` | No | `http://localhost:8000` | Browser-facing API URL |

### Honest speech-to-text boundary

DeepSeek's chat endpoint does not provide an audio transcription API. The app records real browser audio with `MediaRecorder` and uploads the real blob to an OpenAI-compatible Whisper endpoint. To enable it, configure `STT_API_KEY` plus the provider/model if different. Without those values, pasted text remains fully usable and recording returns a clear “not configured” error; it never fabricates a transcript and does not retain the recording.

## How voice preservation works

The core prompt is in [`server/app/prompt.py`](server/app/prompt.py). It deliberately treats the model as an editor, not a generic ghostwriter:

1. Infer a concrete voice profile from the actual source: rhythm, vocabulary, hedging, humor, fragments, punctuation, and code-switching.
2. Preserve up to five distinctive source phrases verbatim and expose them in the UI, so fidelity is inspectable rather than a vague claim.
3. Structure for the selected platform while keeping voice higher priority than platform clichés.
4. Forbid invented facts, confidence, experience, fake vulnerability, manufactured hooks, tidy moral lessons, emoji garnish, and other common AI tells.
5. Run a final “could generic AI have written this?” self-check and return strict JSON containing the draft, profile, and preserved phrases.

Format rules are genuinely different: LinkedIn has short readable paragraphs; X uses numbered ≤280-character posts; newsletter has subject/opening/sign-off; blog has title and longer structure; short video is written for breath with hook/body/close.

## Persistence and verification

Every successful generation is inserted into `generations`; every clicked verdict is inserted into `feedback` with a foreign key to that generation. The buttons call the API and only show “Saved” after SQLite accepts the row.

Run tests and build:

```bash
cd server && uv run pytest
npm --prefix web run build
```

Run the repository's real provider-backed end-to-end example (this consumes one model request and writes one generation plus one `sounds_like_me` verdict):

```bash
cd server && uv run python scripts/e2e_example.py
```

Inspect real feedback in either form:

```bash
curl http://localhost:8000/api/feedback
sqlite3 data/thoughts.db \
  'SELECT f.id, f.value, f.created_at, g.content_format, substr(g.source_text,1,60) FROM feedback f JOIN generations g ON g.id=f.generation_id ORDER BY f.id DESC;'
```

## Acceptance walkthrough

Use this intentionally voice-heavy sample (also available from “Try a voice-y example”):

> Okay, here's the thing I keep coming back to: productivity advice is weirdly obsessed with squeezing more out of a day. I don't need twelve optimized hours. I need, like, two honest hours where my brain isn't negotiating with six tabs and a blinking phone. Maybe the goal isn't doing more. Maybe it's making the good hours less crowded.

1. Paste it, select **LinkedIn**, and generate. Compare both columns and check that phrases such as “two honest hours” or “the good hours less crowded” survive, and that the tentative “maybe” is not upgraded into certainty.
2. Generate again as **X thread** and confirm the numbered, shorter shape differs.
3. Copy the result and download the Markdown file.
4. Click **Sounds like me** (or another verdict), then use the curl or SQLite query above to verify the record.
5. Optionally configure STT, record a voice note, stop, edit the returned transcript, and generate.

## Architecture

- `web/`: Vite + React + TypeScript + Tailwind; responsive capture and side-by-side validation UI.
- `server/`: FastAPI; DeepSeek and STT provider calls remain server-side, so keys never enter the browser.
- `data/`: SQLite database, created on API startup; generated DB/WAL files are gitignored.
- `cache/`: reserved for future local processing; no fake or cached output ships with the MVP.

No account system, publishing integrations, paywall, team layer, or long-term voice cloning are included. Those remain deliberately outside the validation scope.
