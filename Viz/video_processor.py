import os
import time
from typing import Dict, Any

import google.generativeai as genai
from dotenv import load_dotenv


load_dotenv()


class GeminiVideoProcessor:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Gemini API key not found. Set GEMINI_API_KEY environment variable.")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def upload_video(self, video_path: str):
        print(f"Uploading video: {video_path}")
        video_file = genai.upload_file(path=video_path)
        print("Waiting for video processing...")
        while video_file.state.name == "PROCESSING":
            time.sleep(2)
            video_file = genai.get_file(video_file.name)
        if video_file.state.name == "FAILED":
            raise ValueError(f"Video processing failed: {video_file.state.name}")
        print(f"Video uploaded successfully: {video_file.uri}")
        return video_file

    def analyze_video(self, video_path: str, prompt: str | None = None) -> Dict[str, Any]:
        if prompt is None:
            prompt = (
                "Provide an in-depth analysis of this video including transcript, scenes, visuals, and audio."
            )
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        video_file = self.upload_video(video_path)
        try:
            response = self.model.generate_content([video_file, prompt])
            result = {
                "video_path": video_path,
                "prompt": prompt,
                "analysis": response.text,
                "video_uri": video_file.uri,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
            genai.delete_file(video_file.name)
            print("Analysis complete!")
            return result
        except Exception as e:
            try:
                genai.delete_file(video_file.name)
            except Exception:
                pass
            raise Exception(f"Error analyzing video: {str(e)}")


