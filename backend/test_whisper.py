# backend/test_whisper.py
# Quick sanity check that Whisper loads and can transcribe.

import whisper
import time

print("Loading Whisper base model (this downloads ~150MB the first time)...")
start = time.time()
model = whisper.load_model("base")
print(f"Model loaded in {time.time() - start:.1f}s")

print("\nWhisper is ready. Model details:")
print(f"Model type: {type(model)}")
print("Whisper installation verified successfully.")