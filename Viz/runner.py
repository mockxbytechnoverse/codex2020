import os
import time
import shutil
import argparse
import subprocess
from typing import Optional
import shlex

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from .webm_to_mp4_converter import WebMToMP4Converter
from .video_processor import GeminiVideoProcessor


# Defaults for this machine (override via CLI flags)
HOME_DIR = os.path.expanduser("~")
DEFAULT_WATCHED_DIR = f"{HOME_DIR}/Downloads/mcp-recordings"
DEFAULT_WORKDIR = f"{HOME_DIR}/Desktop/OpenStudyAI/Mock-X-WebApp/"


SYSTEM_PROMPT = (
    "You are an expert web developer assistant. A user has provided a request for changes to a webapp. "
    "Please analyze the request and implement the necessary changes to the codebase. Focus on understanding "
    "the user's intent and making precise, well-structured modifications to the code."
)


def analyze_video_to_text(video_path: str) -> str:
    """Analyze a video with Gemini and return plain text analysis."""
    processor = GeminiVideoProcessor()
    custom_prompt = (
        "Analyze this video as if you're a web developer assistant. Focus on:\n"
        "1. Any UI/UX elements, web interfaces, or application screens shown\n"
        "2. User interactions with websites, apps, or interfaces\n"
        "3. Text content, buttons, forms, or other interactive elements\n"
        "4. Navigation patterns and user workflows\n"
        "5. Any code, terminals, or development tools visible\n"
        "6. Specific tasks or changes the user appears to be making\n"
        "7. Overall context of what the user is trying to accomplish\n\n"
        "Provide detailed analysis that would help understand what changes or improvements the user might want to make to a web application."
    )
    result = processor.analyze_video(video_path, custom_prompt)
    return result.get("analysis", "")


class NewFileHandler(FileSystemEventHandler):
    def __init__(self, use_codex: bool = False, codex_model: str = "gpt-5-nano", command_workdir: Optional[str] = None, clip_seconds: Optional[int] = None, downscale: Optional[int] = None, crf: int = 28, save_artifacts: bool = False):
        super().__init__()
        self.use_codex = use_codex
        self.codex_model = codex_model
        self.command_workdir = command_workdir or DEFAULT_WORKDIR
        self.clip_seconds = clip_seconds
        self.downscale = downscale
        self.crf = crf
        self.save_artifacts = save_artifacts

    def on_created(self, event):
        if event.is_directory:
            return

        if not event.src_path.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm")):
            return

        filename = os.path.abspath(event.src_path)
        print(f"New file detected: {filename}")

        if event.src_path.endswith(".webm"):
            mp4_path = event.src_path.replace(".webm", ".mp4")
            print(f"Converting {event.src_path} to {mp4_path}")
            converter = WebMToMP4Converter()
            success = converter.convert(event.src_path, mp4_path)
            if success:
                event.src_path = mp4_path
                filename = os.path.abspath(mp4_path)
                print(f"Successfully converted to {mp4_path}")
            else:
                print(f"Failed to convert {event.src_path}")
                return

        # Optional pre-processing to reduce upload time
        processed_filename = self._maybe_prepare_for_speed(filename)

        try:
            message_output = analyze_video_to_text(processed_filename)
        except Exception as e:
            print(f"Video analysis failed: {e}")
            return

        print(message_output)

        try:
            full_prompt = f"{SYSTEM_PROMPT}\n\n{message_output}"
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            os.makedirs(self.command_workdir, exist_ok=True)

            runner = "codex" if self.use_codex else "claude"
            if self.use_codex:
                codex_path = shutil.which("codex")
                if not codex_path:
                    for path in [
                        "/opt/homebrew/bin/codex",
                        "/usr/local/bin/codex",
                        os.path.expanduser("~/.local/bin/codex"),
                    ]:
                        if os.path.exists(path):
                            codex_path = path
                            break
                if not codex_path:
                    print("Error: codex command not found in PATH or common locations")
                    return
                cmd_args = [codex_path, "--model", self.codex_model, "--full-auto"]
            else:
                claude_path = shutil.which("claude")
                if not claude_path:
                    for path in [
                        "/Users/alejandroramirez/.nvm/versions/node/v18.20.3/bin/claude",
                        os.path.expanduser("~/.nvm/versions/node/v18.20.3/bin/claude"),
                        "/usr/local/bin/claude",
                        "/opt/homebrew/bin/claude",
                    ]:
                        if os.path.exists(path):
                            claude_path = path
                            break
                    if not claude_path:
                        print("Error: claude command not found in PATH or common locations")
                        return
                cmd_args = [claude_path, "--dangerously-skip-permissions"]

            # Optionally save artifacts (prompt + command log) to workdir
            output_path = None
            if self.save_artifacts:
                output_filename = f"full_prompt_{timestamp}.txt"
                output_path = os.path.join(self.command_workdir, output_filename)
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(full_prompt)
                print(f"Full prompt saved to: {output_path}")

                cmd_log_name = f"{runner}_command_{timestamp}.txt"
                command_log_path = os.path.join(self.command_workdir, cmd_log_name)
                with open(command_log_path, "w", encoding="utf-8") as f:
                    f.write("=" * 80 + "\n")
                    f.write(f"Command Log - {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write("=" * 80 + "\n\n")
                    f.write(f"RUNNER: {runner}\n")
                    if self.use_codex:
                        f.write(f"MODEL: {self.codex_model}\n\n")
                    else:
                        f.write("FLAGS: --dangerously-skip-permissions\n\n")
                    f.write("VIDEO FILE:\n")
                    f.write(f"{filename}\n\n")
                    f.write("SYSTEM PROMPT:\n")
                    f.write(f"{SYSTEM_PROMPT}\n\n")
                    f.write("VIDEO ANALYSIS OUTPUT:\n")
                    f.write(f"{message_output}\n\n")
                    f.write("FULL PROMPT:\n")
                    f.write(f"{full_prompt}\n\n")
                    f.write("COMMAND ARGS:\n")
                    f.write(" ".join(shlex.quote(x) for x in cmd_args) + "\n\n")
                    if output_path:
                        f.write(f"STDIN saved to: {output_path}\n")
                    f.write("=" * 80 + "\n")

                print(f"Command details saved to: {command_log_path}")

            env = os.environ.copy()
            current_path = env.get("PATH", "")
            nvm_paths = [
                os.path.expanduser("~/.nvm/versions/node/v18.20.3/bin"),
                "/usr/local/bin",
                "/opt/homebrew/bin",
            ]
            for nvm_path in nvm_paths:
                if nvm_path not in current_path:
                    env["PATH"] = f"{nvm_path}:{current_path}"
                    current_path = env["PATH"]

            subprocess.run(
                cmd_args,
                check=True,
                cwd=self.command_workdir,
                env=env,
                input=full_prompt,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"Command failed: {e}")

    def _maybe_prepare_for_speed(self, filename: str) -> str:
        if not self.clip_seconds and not self.downscale:
            return filename
        try:
            converter = WebMToMP4Converter()
            ffmpeg = converter.ffmpeg_path
        except Exception:
            print("FFmpeg not available for pre-processing; proceeding without compression/clip.")
            return filename

        output_path = os.path.splitext(filename)[0] + "__viz_prepped.mp4"
        cmd = [ffmpeg, "-y", "-ss", "0", "-i", filename]
        if self.clip_seconds:
            cmd += ["-t", str(self.clip_seconds)]
        vf = None
        if self.downscale and isinstance(self.downscale, int):
            vf = f"scale=-2:{self.downscale}"
        if vf:
            cmd += ["-vf", vf]
        cmd += [
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", str(self.crf),
            "-c:a", "aac",
            "-b:a", "96k",
            output_path,
        ]
        try:
            print(f"Pre-processing for speed → {output_path} (clip={self.clip_seconds}, downscale={self.downscale}, crf={self.crf})")
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            return output_path if os.path.exists(output_path) and os.path.getsize(output_path) > 0 else filename
        except Exception as e:
            print(f"Pre-processing failed ({e}); proceeding with original file.")
            return filename


def main():
    parser = argparse.ArgumentParser(description="Watch for new screen recordings, analyze, and pipe prompt to CLI (claude or codex)")
    parser.add_argument("--use-codex", action="store_true", help="Use codex CLI instead of claude")
    parser.add_argument("--codex-model", type=str, default="gpt-5-nano", help="Codex model name when using --use-codex")
    parser.add_argument("--watched-dir", type=str, default=DEFAULT_WATCHED_DIR, help="Directory to watch for new recordings")
    parser.add_argument("--workdir", type=str, default=DEFAULT_WORKDIR, help="Working directory where command is executed and logs are written")
    parser.add_argument("--clip-seconds", type=int, default=None, help="Optionally clip the video to the first N seconds before upload")
    parser.add_argument("--downscale", type=int, default=None, help="Optionally downscale the video height (e.g., 720) before upload")
    parser.add_argument("--crf", type=int, default=28, help="CRF for re-encode when downscaling/clipping (lower = better quality, larger file)")
    parser.add_argument("--save-artifacts", action="store_true", help="Write full_prompt_*.txt and <runner>_command_*.txt to --workdir")
    args = parser.parse_args()

    watched_dir = args.watched_dir
    workdir = args.workdir

    if not os.path.exists(watched_dir):
        os.makedirs(watched_dir)

    event_handler = NewFileHandler(use_codex=args.use_codex, codex_model=args.codex_model, command_workdir=workdir, clip_seconds=args.clip_seconds, downscale=args.downscale, crf=args.crf, save_artifacts=args.save_artifacts)
    observer = Observer()
    observer.schedule(event_handler, path=watched_dir, recursive=False)

    runner_name = "codex" if args.use_codex else "claude"
    print(f"Watching directory: {watched_dir}")
    print(f"Runner: {runner_name}")
    if args.use_codex:
        print(f"Codex model: {args.codex_model}")
    print(f"Working directory: {workdir}")

    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("Stopped watching.")
    observer.join()


if __name__ == "__main__":
    main()


