## Viz integration implementation guide

### Scope and outcome

- **Goal**: Integrate the `Viz/` video-analysis pipeline with the existing Chrome extension and `browser-tools-server/`, enabling single- and multi-turn change requests driven by user recordings from the popup UI.
- **Outcome**: Users record from the popup, the server analyzes the recording via Gemini, builds a prompt, runs `claude` (or `codex`) in the target `workdir`, and streams progress/status back to the popup. Follow-up recordings or text prompts continue in the same conversation.

### Components

- **Chrome extension (`chrome-extension/`)**: Popup for starting recordings, selecting conversations, and viewing live status.
- **Browser Tools Server (`browser-tools-server/`)**: HTTP/WebSocket APIs; orchestrates analysis and edits; persists artifacts.
- **Viz (`Viz/`)**: Python Gemini wrapper and media helpers (FFmpeg). Will gain a small CLI for one-shot analysis.

### References

- **Claude Code overview** (CLI can edit files, run commands, create commits; supports MCP): [Claude Code overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- **Codex CLI** (fallback runner option): [OpenAI Codex CLI README](https://github.com/openai/codex/blob/main/README.md)

## Phase 1 — Minimal end‑to‑end integration

### 1) Add a one‑shot Python CLI in `Viz/`

- New file: `Viz/cli_analyze.py`
- Responsibilities:
  - Parse args: `--video-path`, `--custom-prompt` (optional), `--model` (default `gemini-1.5-flash`), `--clip-seconds`, `--downscale`, `--crf`.
  - Optional pre-processing (clip/downscale) mirroring `Viz/runner.py`.
  - Reuse `GeminiVideoProcessor` to upload and analyze the video.
  - Print JSON to stdout: `{ analysis: string, video_uri: string, timestamp: string }`.
- Env: requires `GEMINI_API_KEY` in environment (dotenv already loaded by `Viz/video_processor.py`).

Example invocation:

```bash
python -m Viz.cli_analyze --video-path "~/Downloads/mcp-recordings/recording-....webm"
```

### 2) Orchestrator in `browser-tools-server/`

- Add a small module (TypeScript) to:
  - Locate Python (`python3`) and spawn `python -m Viz.cli_analyze ...`.
  - Build `fullPrompt = SYSTEM_PROMPT + "\n\n" + analysis`.
  - Resolve runner and execute:
    - **Claude**: `claude` with working directory set to `workdir`. Prefer named session per conversation if the CLI supports it (see Phase 2).
    - **Codex**: `codex --model <model> --full-auto` as fallback.
  - Emit progress via WebSocket events to the popup: `viz-status` with phases (`queued`, `analyzing`, `analysisComplete`, `runnerStarting`, `runnerOutput`, `runnerComplete`, `failed`). Always include `conversationId` and `analysisId`.
  - Persist artifacts (when enabled): `workdir/.viz/full_prompt_<timestamp>.txt`, `workdir/.viz/<runner>_command_<timestamp>.txt`.

#### Server settings additions

- Extend existing `currentSettings` with:
  - `workdir: string` (path where edits run)
  - `viz: { clipSeconds?: number, downscale?: number, crf: number, runner: 'claude'|'codex', codexModel?: string, saveArtifacts?: boolean }`

#### New HTTP endpoints

- `POST /viz/settings`

  - Body: `{ workdir?: string, viz?: { clipSeconds?, downscale?, crf?, runner?, codexModel?, saveArtifacts? } }`
  - Effect: merge into server settings; validate paths.

- `POST /viz/analyze-and-run`

  - Body: `{ recordingPath: string, description?: string, conversationId?: string, runner?: 'claude'|'codex', immediate?: boolean }`
  - Behavior: enqueue analysis + run; returns `{ analysisId: string }`.

- `GET /viz/analysis-status/:analysisId`

  - Returns: `{ status, phase, conversationId, analysisId, message?, startedAt?, completedAt?, artifacts? }`.

- `GET /viz/conversations`
  - Returns recent conversations with last status, `workdir`, and runner.

#### WebSocket events to popup

- Envelope:

```json
{
  "type": "viz-status",
  "conversationId": "conv_123",
  "analysisId": "analysis_...",
  "phase": "runnerOutput",
  "message": "..."
}
```

### 3) Popup‑focused Chrome extension updates

- Manifest: set `action.default_popup` to new `popup-viz.html`.
- New UI (`popup-viz.html`/`popup-viz.js`):
  - Start new conversation: textarea for instruction; “Record now”.
  - Follow up: dropdown of conversations; “Record follow-up”.
  - Status area: shows latest `viz-status` events for the active conversation.
- Flow:
  1. User records from popup (existing pipeline posts to `/recording-data`).
  2. On save success, popup calls `POST /viz/analyze-and-run` with `recordingPath` (+ selected `conversationId` or new).
  3. Subscribe to `viz-status` via existing server WebSocket; filter by `conversationId`.

### 4) Artifacts and persistence

- Directory layout under `workdir`:
  - `.viz/full_prompt_<timestamp>.txt`
  - `.viz/<runner>_command_<timestamp>.txt`
  - `.viz/conversations/<conversationId>/events.jsonl` (Phase 2)

## Phase 2 — Multi‑turn conversations and resume

### Conversation model

- `Conversation`: `{ id, title, createdAt, runner: 'claude'|'codex', workdir, lastStatus, lastUpdated }`
- `Turn`: `{ t, type: 'video'|'text'|'screenshot', source: 'user'|'system'|'runner', payload, artifacts?, status }`
- Storage: `workdir/.viz/conversations/<conversationId>/` with `events.jsonl`.

### Session resume strategies

- **Preferred**: use named sessions if supported by the Claude Code CLI to bind a stable session per `conversationId` so edits accumulate in context. See the overview and linked CLI docs from Anthropic: [Claude Code overview](https://docs.anthropic.com/en/docs/claude-code/overview).
- **Fallback**: reconstruct prompt from prior `Turn` summaries. Keep size bounded by summarizing older turns.

### New/updated endpoints

- `POST /viz/followup`

  - Body: `{ conversationId: string, type: 'video'|'text'|'screenshot', text?, recordingPath?, screenshotPath? }`
  - Behavior: analyze as needed, then run using the same session or reconstructed prompt.

- `GET /viz/conversation/:id`
  - Returns conversation metadata and turns.

### Popup additions

- Conversations list (last status/time); ability to add text-only follow-ups.
- Progress view bound to the selected conversation.

## Phase 3 — Reliability, speed, UX polish

- **Speed**: enable `clipSeconds/downscale/CRF` heuristics for large files; surface a toggle in popup.
- **Robustness**: backoff/retry Gemini uploads; detect missing dependencies (`GEMINI_API_KEY`, `ffmpeg`, `claude`/`codex`) and emit actionable errors to the popup.
- **Progress granularity**: stream runner stdout in chunks as `runnerOutput` messages.
- **Security**: local-only file paths; explicit `workdir` binding; no external uploads beyond Gemini.

## Detailed tasks (checklist)

### Viz CLI (Python)

- [ ] Create `Viz/cli_analyze.py` using `GeminiVideoProcessor`.
- [ ] Add arg parsing and optional pre-processing (clip/downscale/CRF).
- [ ] Print strict JSON to stdout; non-zero exit on failure.

### Server orchestrator (TypeScript)

- [ ] Add settings: `workdir`, `viz` object (runner, model, pre-process, artifacts).
- [ ] Implement orchestrator: spawn Python CLI, build prompt, run `claude`/`codex` in `workdir`.
- [ ] Implement WebSocket `viz-status` stream and lifecycle phases.
- [ ] Persist artifacts under `workdir/.viz/` when enabled.

### Server APIs

- [ ] `POST /viz/settings` (validate/store settings).
- [ ] `POST /viz/analyze-and-run` (enqueue and trigger orchestrator).
- [ ] `GET /viz/analysis-status/:analysisId` (status + artifacts link if available).
- [ ] `GET /viz/conversations` (initially stub; filled in Phase 2).

### Extension popup

- [ ] Add `action.default_popup: "popup-viz.html"` to manifest.
- [ ] Implement `popup-viz.html/js` with new/continue conversation flows.
- [ ] Wire to existing recording flow and call `/viz/analyze-and-run` on save.
- [ ] Subscribe to `viz-status` and render progress.

### Multi‑turn (Phase 2)

- [ ] Add conversations storage under `workdir/.viz/conversations/`.
- [ ] Implement `POST /viz/followup`, `GET /viz/conversation/:id`.
- [ ] Add named session handling for Claude Code CLI if supported; else prompt reconstruction.

### QA & Ops

- [ ] Mac setup: verify `ffmpeg/ffprobe`, `python3`, `GEMINI_API_KEY`, and `claude`/`codex` PATH resolution.
- [ ] E2E test: record a short clip (≤60s), observe edits in `workdir` and status in popup.
- [ ] Failure modes: remove API key / runner binary and verify user-facing errors.
- [ ] Artifacts: confirm `full_prompt_*.txt` and command logs are written when enabled.

## API shapes (concise)

### `POST /viz/analyze-and-run`

```json
{
  "recordingPath": "/Users/.../Downloads/mcp-recordings/recording-2025-08-15T12-34-56.webm",
  "description": "Fix the signup form CSS per video",
  "conversationId": "conv_123",
  "runner": "claude",
  "immediate": true
}
```

### WebSocket `viz-status` sample

```json
{
  "type": "viz-status",
  "conversationId": "conv_123",
  "analysisId": "analysis_1734042012345",
  "phase": "runnerOutput",
  "message": "Applying edits to components/Button.tsx..."
}
```

## Dependencies and environment

- **Python**: `watchdog`, `google-generativeai`, `python-dotenv` (see `Viz/requirements.txt`).
- **System**: `ffmpeg`/`ffprobe` in PATH.
- **CLI**: `claude` (preferred) or `codex` (fallback) available on PATH.
- **Env**: `GEMINI_API_KEY` exported or provided via `.env`.

## Acceptance criteria

- Start a recording from the popup, see live phases in the popup, and observe edits applied in the selected `workdir`.
- Start a follow-up in the same conversation and see edits continue in context.
- Clear, actionable error messages when dependencies are missing.
- Artifacts saved under `workdir/.viz/` when enabled.

## Runbook (local dev)

- Install CLIs and deps per references:
  - Claude Code CLI: see Anthropic docs: [Claude Code overview](https://docs.anthropic.com/en/docs/claude-code/overview)
  - Codex CLI (optional): [OpenAI Codex CLI README](https://github.com/openai/codex/blob/main/README.md)
- Ensure `ffmpeg/ffprobe` are installed (e.g., `brew install ffmpeg`).
- Export `GEMINI_API_KEY` and start the server (`npm run start` in `browser-tools-server/`).
- Load the extension (Developer mode) and open the popup.
