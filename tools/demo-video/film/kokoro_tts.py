"""Narration for the demo film with Kokoro, a free open-source neural voice (Apache-2.0) that runs offline.

Setup (once):
  python -m venv .venv && .venv/bin/pip install kokoro-onnx==0.4.9 soundfile
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
Run:
  .venv/bin/python kokoro_tts.py <out-dir>          # voice af_heart, speed 0.92, text from ../narration.json
"""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

here = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "audio")
os.makedirs(out, exist_ok=True)
k = Kokoro(os.environ.get("KOKORO_MODEL", "kokoro-v1.0.onnx"), os.environ.get("KOKORO_VOICES", "voices-v1.0.bin"))
segments = json.load(open(os.path.join(here, "..", "narration.json")))["segments"]
for sid in ["01-problem", "02-what", "03-private", "03b-miniapp", "04-group-channel", "05-bug-loop", "05b-install", "06-close"]:
    samples, sr = k.create(segments[sid], voice="af_heart", speed=0.92, lang="en-us")
    sf.write(os.path.join(out, f"{sid}.wav"), samples, sr)
    print(sid, round(len(samples) / sr, 2), "s")
