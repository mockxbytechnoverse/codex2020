import argparse
import json
import os
import sys
import time
from typing import Optional

from .video_processor import GeminiVideoProcessor
from .webm_to_mp4_converter import WebMToMP4Converter


SYSTEM_PROMPT_DEFAULT = (
    "Analyze this video as if you're a web developer assistant. Focus on: \n"
    "1. UI/UX elements and user interactions\n"
    "2. Text content, buttons, forms, navigation\n"
    "3. Any visible code, terminals, or tools\n"
    "4. Specific tasks or changes being requested\n"
    "5. Overall user intent and context\n\n"
    "Provide detailed analysis that would help implement changes to a web application."
)


def maybe_convert_webm(input_path: str) -> str:
    """Convert .webm to .mp4 if needed. On failure, return original path."""
    try:
        if input_path.lower().endswith(".webm"):
            mp4_path = os.path.splitext(input_path)[0] + ".mp4"
            converter = WebMToMP4Converter()
            success = converter.convert(input_path, mp4_path, force=True, keep_original=True)
            if success and os.path.exists(mp4_path) and os.path.getsize(mp4_path) > 0:
                return mp4_path
    except Exception:
        # Fall back to original file
        pass
    return input_path


def maybe_preprocess_for_speed(input_path: str, clip_seconds: Optional[int], downscale: Optional[int], crf: int) -> str:
    """Optionally clip and/or downscale to speed up upload/analysis."""
    if not clip_seconds and not downscale:
        return input_path
    try:
        converter = WebMToMP4Converter()
        ffmpeg = converter.ffmpeg_path
    except Exception:
        return input_path

    # Build output path
    output_path = os.path.splitext(input_path)[0] + "__viz_prepped.mp4"

    import subprocess

    cmd = [ffmpeg, "-y", "-ss", "0", "-i", input_path]
    if clip_seconds:
        cmd += ["-t", str(clip_seconds)]
    vf = None
    if downscale and isinstance(downscale, int):
        vf = f"scale=-2:{downscale}"
    if vf:
        cmd += ["-vf", vf]
    cmd += [
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", str(crf),
        "-c:a", "aac",
        "-b:a", "96k",
        output_path,
    ]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path
    except Exception:
        pass
    return input_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze a video with Gemini and output JSON")
    parser.add_argument("--video-path", required=True, help="Path to the input video file")
    parser.add_argument("--custom-prompt", default=None, help="Custom analysis prompt override")
    parser.add_argument("--model", default="gemini-1.5-flash", help="Gemini model name")
    parser.add_argument("--clip-seconds", type=int, default=None, help="Clip video to first N seconds")
    parser.add_argument("--downscale", type=int, default=None, help="Downscale height (e.g., 720)")
    parser.add_argument("--crf", type=int, default=28, help="CRF when re-encoding (lower = higher quality)")
    args = parser.parse_args()

    video_path = os.path.abspath(os.path.expanduser(args.video_path))
    if not os.path.exists(video_path):
        print(json.dumps({"error": f"Video not found: {video_path}"}), file=sys.stderr)
        return 2

    try:
        # Convert .webm to .mp4 for maximum compatibility
        prepared_path = maybe_convert_webm(video_path)
        # Optional speed-up processing
        prepared_path = maybe_preprocess_for_speed(prepared_path, args.clip_seconds, args.downscale, args.crf)

        # Run analysis
        processor = GeminiVideoProcessor()
        custom_prompt = args.custom_prompt or SYSTEM_PROMPT_DEFAULT

        # Temporarily override model if provided differently
        # Note: GeminiVideoProcessor currently hardcodes model; we will rely on its default
        result = processor.analyze_video(prepared_path, custom_prompt)

        payload = {
            "video_path": prepared_path,
            "video_uri": result.get("video_uri"),
            "analysis": result.get("analysis", ""),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        print(json.dumps(payload, ensure_ascii=False))
        return 0
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())


