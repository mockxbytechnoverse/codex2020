#!/usr/bin/env python3
import os
import sys
import subprocess
import shutil
import json
from pathlib import Path
from typing import Optional, Dict, Tuple


class WebMToMP4Converter:
    def __init__(self, ffmpeg_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or self._find_ffmpeg()
        if not self.ffmpeg_path:
            raise RuntimeError("FFmpeg not found. Please install FFmpeg or provide path.")
        self.ffprobe_path = self._find_ffprobe()

    def _find_ffmpeg(self) -> Optional[str]:
        for name in ["ffmpeg", "ffmpeg.exe"]:
            if shutil.which(name):
                return name
        for path in [
            r"C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
            r"C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
            r"C:\\ffmpeg\\bin\\ffmpeg.exe",
            "/usr/local/bin/ffmpeg",
            "/usr/bin/ffmpeg",
        ]:
            if os.path.exists(path):
                return path
        return None

    def _find_ffprobe(self) -> Optional[str]:
        if not self.ffmpeg_path:
            return None
        ffmpeg_dir = os.path.dirname(os.path.abspath(self.ffmpeg_path))
        ffprobe_path = os.path.join(ffmpeg_dir, "ffprobe" + (".exe" if sys.platform == "win32" else ""))
        if os.path.exists(ffprobe_path):
            return ffprobe_path
        return shutil.which("ffprobe") or shutil.which("ffprobe.exe")

    def analyze_video(self, input_path: str) -> Dict[str, object]:
        if not self.ffprobe_path:
            return {"error": "ffprobe not found"}
        cmd = [
            self.ffprobe_path,
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            input_path,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                return json.loads(result.stdout)
            return {"error": result.stderr}
        except Exception as e:
            return {"error": str(e)}

    def get_video_duration(self, input_path: str) -> Optional[float]:
        info = self.analyze_video(input_path)
        try:
            if "format" in info and "duration" in info["format"]:
                return float(info["format"]["duration"])
            for stream in info.get("streams", []):
                if stream.get("codec_type") == "video" and "duration" in stream:
                    return float(stream["duration"])
        except Exception:
            pass
        return None

    def convert_with_strategy(self, input_path: str, output_path: str, strategy: int = 1) -> Tuple[bool, str]:
        if strategy == 1:
            cmd = [
                self.ffmpeg_path,
                "-i",
                input_path,
                "-c:v",
                "copy",
                "-c:a",
                "copy",
                "-movflags",
                "+faststart",
                "-y",
                output_path,
            ]
        elif strategy == 2:
            cmd = [
                self.ffmpeg_path,
                "-err_detect",
                "ignore_err",
                "-i",
                input_path,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-movflags",
                "+faststart",
                "-y",
                output_path,
            ]
        elif strategy == 3:
            cmd = [
                self.ffmpeg_path,
                "-f",
                "webm",
                "-i",
                input_path,
                "-c",
                "copy",
                "-f",
                "mp4",
                "-movflags",
                "+faststart+frag_keyframe+empty_moov",
                "-y",
                output_path,
            ]
        elif strategy == 4:
            cmd = [
                self.ffmpeg_path,
                "-err_detect",
                "ignore_err",
                "-fflags",
                "+genpts+igndts",
                "-i",
                input_path,
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "23",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-ar",
                "48000",
                "-ac",
                "2",
                "-max_muxing_queue_size",
                "9999",
                "-movflags",
                "+faststart",
                "-y",
                output_path,
            ]
        else:
            return False, "Invalid strategy"

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
            )
            process.wait()
            if process.returncode == 0:
                return True, "Conversion successful"
            return False, process.stderr.read()
        except Exception as e:
            return False, str(e)

    def convert(self, input_path: str, output_path: Optional[str] = None, force: bool = False, keep_original: bool = True) -> bool:
        if not os.path.exists(input_path):
            print(f"Error: Input file not found: {input_path}")
            return False
        if not output_path:
            output_path = str(Path(input_path).with_suffix(".mp4"))
        if os.path.exists(output_path) and not force:
            print(f"Error: Output file already exists: {output_path}")
            print("Use --force to overwrite")
            return False
        strategies = [1, 2, 3, 4]
        for strategy in strategies:
            success, _ = self.convert_with_strategy(input_path, output_path, strategy)
            if success and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                if not keep_original:
                    try:
                        os.remove(input_path)
                    except Exception:
                        pass
                return True
        print("All conversion strategies failed")
        return False


