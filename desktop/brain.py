"""AGNI voice + input engine (GOD MODE).

Talks to Electron over stdin/stdout, one JSON object per line.
  -> Electron : {"type":"ready"} {"type":"level","v":0..1} {"type":"partial","text":..}
                {"type":"final","text":..} {"type":"error","text":..}
  <- Electron : {"cmd":"mute"|"listen","value":bool} {"cmd":"type","text":..}
                {"cmd":"click","button":..,"clicks":n} {"cmd":"move","dx":..,"dy":..}
                {"cmd":"scroll","amount":n} {"cmd":"key","keys":[..]}
"""
import array
import json
import os
import queue
import sys
import threading

RATE = 16000
BLOCK = 1600  # 100 ms of 16-bit audio


def emit(obj):
    try:
        sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    except (IOError, BrokenPipeError):
        os._exit(0)


def resolve_model_path():
    candidates = []
    if len(sys.argv) > 1 and sys.argv[1]:
        candidates.append(sys.argv[1])
        candidates.append(os.path.abspath(sys.argv[1]))

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir) if os.path.basename(script_dir).lower() == "python" else script_dir

    candidates.append(os.path.join(project_dir, "models", "vosk-model-small-en-in-0.4"))
    candidates.append(os.path.join(script_dir, "models", "vosk-model-small-en-in-0.4"))
    candidates.append(os.path.join(project_dir, "vosk-model-small-en-in-0.4"))

    for p in candidates:
        if os.path.isdir(p):
            return p
    return None


model_path = resolve_model_path()
if not model_path:
    req_path = sys.argv[1] if len(sys.argv) > 1 else "models/vosk-model-small-en-in-0.4"
    emit({
        "type": "error",
        "text": "Vosk model folder not found: %s. Download vosk-model-small-en-in-0.4 into models/ (see README)." % req_path
    })
    sys.exit(2)

try:
    import sounddevice as sd
    import vosk
    import pyautogui
except ImportError as e:
    pkg = getattr(e, "name", str(e))
    emit({
        "type": "error",
        "text": "Missing Python package: %s. Run: pip install -r python/requirements.txt" % pkg
    })
    sys.exit(2)

# Configure PyAutoGUI for fluid execution without blocking failsafes
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.02

vosk.SetLogLevel(-1)
try:
    model = vosk.Model(model_path)
    rec = vosk.KaldiRecognizer(model, RATE)
except Exception as e:
    emit({"type": "error", "text": "Failed to load Vosk model: %s" % e})
    sys.exit(2)

audio_q = queue.Queue()
state = {"muted": False, "listening": True}


def on_audio(indata, frames, time_info, status):
    audio_q.put(bytes(indata))


def handle_command(msg):
    c = msg.get("cmd")
    if c == "mute":
        # Mute audio recognition while AGNI is speaking to prevent acoustic feedback loop
        state["muted"] = bool(msg.get("value"))
        if state["muted"]:
            while not audio_q.empty():
                try:
                    audio_q.get_nowait()
                except queue.Empty:
                    break
        rec.Reset()
    elif c == "listen":
        state["listening"] = bool(msg.get("value"))
    elif c == "type":
        pyautogui.write(str(msg.get("text", "")), interval=0.01)
    elif c == "click":
        pyautogui.click(button=msg.get("button", "left"), clicks=int(msg.get("clicks", 1)))
    elif c == "move":
        pyautogui.moveRel(int(msg.get("dx", 0)), int(msg.get("dy", 0)), duration=0.25)
    elif c == "scroll":
        pyautogui.scroll(int(msg.get("amount", 0)))
    elif c == "key":
        keys = [str(k) for k in msg.get("keys", [])]
        if len(keys) == 1:
            pyautogui.press(keys[0])
        elif keys:
            pyautogui.hotkey(*keys)


def control_loop():
    for line in sys.stdin:
        if not line:
            break
        try:
            handle_command(json.loads(line))
        except Exception as e:
            emit({"type": "error", "text": "command failed: %s" % e})
    os._exit(0)  # Parent Electron process exited or closed the pipe


threading.Thread(target=control_loop, daemon=True).start()


def rms_level(data):
    samples = array.array("h", data)
    if not samples:
        return 0.0
    total = 0
    sampled = samples[::4]
    for s in sampled:
        total += s * s
    rms = (total / max(1, len(sampled))) ** 0.5
    return min(1.0, rms / 5000.0)


def main():
    stream = None
    last_partial = ""
    emit({"type": "ready"})

    while True:
        want = state["listening"]
        try:
            if want and stream is None:
                stream = sd.RawInputStream(
                    samplerate=RATE,
                    blocksize=BLOCK,
                    dtype="int16",
                    channels=1,
                    callback=on_audio
                )
                stream.start()
                rec.Reset()
            elif not want and stream is not None:
                stream.stop()
                stream.close()
                stream = None
                emit({"type": "level", "v": 0})
        except Exception as e:
            emit({"type": "error", "text": "Microphone error: %s" % e})
            stream = None
            state["listening"] = False

        try:
            data = audio_q.get(timeout=0.25)
        except queue.Empty:
            continue

        if not want or state["muted"]:
            continue

        emit({"type": "level", "v": round(rms_level(data), 3)})
        if rec.AcceptWaveform(data):
            text = json.loads(rec.Result()).get("text", "").strip()
            last_partial = ""
            if text:
                emit({"type": "final", "text": text})
        else:
            part = json.loads(rec.PartialResult()).get("partial", "").strip()
            if part and part != last_partial:
                last_partial = part
                emit({"type": "partial", "text": part})


if __name__ == "__main__":
    main()
