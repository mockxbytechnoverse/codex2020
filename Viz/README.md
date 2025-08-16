## Viz minimal runner

### What it does

- Watches a folder for new video files.
- If the file is `.webm`, converts it to `.mp4` via FFmpeg.
- Uploads the video to Google Gemini and gets a detailed analysis aimed at web-app change requests.
- Builds a full prompt and pipes it into either the `claude` CLI (default) or `codex` CLI.
- Saves the full prompt and an execution log in the `--workdir`.
  - By default, saving is disabled; enable with `--save-artifacts`.

### Architecture

- `Viz/runner.py`:

  - Watches `--watched-dir` using `watchdog`.
  - Optional pre-processing to reduce upload time: `--clip-seconds`, `--downscale`, `--crf`.
  - Converts `.webm` to `.mp4` using `Viz/webm_to_mp4_converter.py`.
  - Calls `Viz/video_processor.py` to run Gemini analysis and collect text output.
  - Writes `full_prompt_<timestamp>.txt` and `<runner>_command_<timestamp>.txt` to `--workdir`.
  - Pipes the prompt to `claude` or `codex` using a shell pipeline.

- `Viz/video_processor.py`:

  - Wraps Google `generativeai` SDK to upload video and generate content.
  - Requires `GEMINI_API_KEY` in the environment.

- `Viz/webm_to_mp4_converter.py`:
  - Minimal FFmpeg wrapper with a few fallback strategies.
  - Requires `ffmpeg` and `ffprobe` in PATH.

### Requirements

- Python 3.12
- Python packages: `watchdog`, `google-generativeai`, `python-dotenv`
- System: `ffmpeg`/`ffprobe` in PATH
- CLI: `claude` (default) or `codex` (if `--use-codex`)

Install (local):

```bash
pip install -r Viz/requirements.txt
```

### Environment variables

- `GEMINI_API_KEY` (required)

Optional environment adjustments: ensure Node/NVM bin dirs are on PATH if `claude` isn’t found automatically.

### Running

Basic:

```bash
python -m Viz.runner \
  --watched-dir ~/Downloads/mcp-recordings \
  --workdir <path-to-project> \
  [--use-codex --codex-model gpt-5-nano] [--save-artifacts]
```

Speed up uploads (clip and downscale):

```bash
python -m Viz.runner \
  --watched-dir ~/Downloads/mcp-recordings \
  --workdir <path-to-project> \
  --clip-seconds 60 --downscale 720 --crf 30 [--save-artifacts]
```

### File outputs

- `full_prompt_<timestamp>.txt`: concatenated system prompt + Gemini analysis.
- `<runner>_command_<timestamp>.txt`: exact CLI pipeline that will be executed.
  - Only written if `--save-artifacts` is passed.

### Troubleshooting

- `claude` not found: install the CLI and ensure it’s on PATH; or use `--use-codex` if you have `codex` installed.
- FFmpeg not found: `brew install ffmpeg` (macOS) or install from ffmpeg.org.
- Slow uploads: use `--clip-seconds` and/or `--downscale` to reduce size before upload.
- Gemini auth: ensure `GEMINI_API_KEY` is exported in your shell or in a `.env` file (dotenv is loaded).

### Improvements / cleanup opportunities

- Replace shell pipe with direct subprocess stdin to avoid shell quoting issues.
- Add retries/backoff for Gemini uploads; show progress bar.
- Compute file size and give heuristics to auto-clip/downscale for target size.
- Stream Gemini responses (if SDK supports) to show live progress.
- Add small health checks on startup (FFmpeg present, CLI present, API key present) with actionable messages.
- Optionally support Anthropic/OpenAI analysis as fallback if Gemini is unavailable.
- Consolidate configuration via a single `config.yaml` or env-var mapping.
- Unit tests: mock Gemini and FFmpeg calls; integration test on a tiny sample clip.
