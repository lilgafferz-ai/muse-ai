# Nex

A silent-by-default voice assistant. It idles quietly in the background,
wakes on the word **"Nex"**, makes a soft **tun-dum** chime, shows a glowing
**orbiting circle**, does what you asked, and then shuts up again. It only
*speaks* when you ask it a question — otherwise it just acts.

This is the **desktop (Python) reference build**. The architecture is written
so every piece maps onto an Android app later (see [Porting](#porting-to-android)).

## Why it's built this way

You asked for a lot: full-device control, an offline genius brain, zero lag,
always listening. Here's the honest engineering translation, and what this
repo actually delivers:

| You asked for | Reality | What Nex does |
|---|---|---|
| Full permission over everything on any device | No OS grants an app total control — that's malware. | Uses normal per-permission access; does real actions through allowed APIs. |
| Offline brain, fast, never lags the phone | Small model = fast but limited; big model = smart but heavy. Pick your tradeoff. | Instant **rule-based brain** for commands + **optional local GGUF model** for open questions. |
| Hovering orbiting circle while talking | Doable (desktop overlay / Android `SYSTEM_ALERT_WINDOW`). | `nex/ui/orbit.py` — always-on-top glowing orbit, hidden when idle. |
| Wakes on "Nex", silent otherwise, tundum sound | All doable offline. | `nex/core/wake.py`, `nex/core/audio.py`, silent-by-default in `nex/core/brain.py`. |
| Inactive in background, no hang | The design goal here. | Listener runs a light STT thread; overlay & TTS only spin up on wake. |

## Quick start (no microphone needed)

```bash
python run_nex.py --demo
```

Then type transcripts, e.g.:

```
> nex what time is it
> nex open browser
> nex search for weather today
```

In `--demo` mode you *type* what the mic would hear, so you can try the whole
flow on any machine. Notice: `nex open browser` acts silently; `nex what time
is it` speaks back — that's silent-by-default working.

## Full experience

```bash
pip install -r requirements.txt          # vosk, sounddevice, pyttsx3, simpleaudio
# download a Vosk small model into models/vosk-small  (see below)
python run_nex.py
```

Then just talk: *"Nex, what time is it?"*

### Offline speech model

Grab a small offline model from the Vosk site and unzip it to
`models/vosk-small` (about 40 MB, English). Set a different path in
`nex.config.json` if you like.

### Optional smart brain

Drop a quantized GGUF model somewhere and set `local_model_path` in
`nex.config.json`, plus `pip install llama-cpp-python`. Then open questions
("Nex, why is the sky blue?") get answered locally. Leave it empty and Nex
stays purely rule-based (still handles all commands).

## Architecture

```
run_nex.py            entry point (--demo for no-mic testing)
nex/
  config.py           all tunables (wake word, colors, model paths...)
  app.py              orchestrator: ears -> brain -> mouth -> face
  core/
    wake.py           offline wake-word listener ("Nex" + aliases)
    brain.py          decision engine (command -> local LLM -> cloud -> give up)
    commands.py       plugin command registry (time, open, search, ...)
    voice.py          offline TTS (pyttsx3) with print fallback
    audio.py          procedural "tun-dum" chime generator + player
  ui/
    orbit.py          always-on-top orbiting glow overlay
tests/
  test_nex.py         headless unit tests (no mic/display required)
```

### Adding a command

```python
from nex.core.commands import command, CommandResult

@command("lock screen", help="Lock the computer.")
def cmd_lock(ctx):
    # ... do the thing ...
    return CommandResult(speak="")   # silent action
```

That's it — the brain picks it up automatically.

## Porting to Android

The Python pieces are deliberately thin wrappers so the *logic* ports cleanly:

- **Wake word** → on-device model (Vosk Android / Porcupine) in a foreground
  `Service`. `extract_command_after_wake()` logic is identical.
- **Orbit overlay** → `SYSTEM_ALERT_WINDOW` permission + a Compose/Canvas view;
  `orbit_position()` geometry is reused verbatim.
- **Tundum** → ship the generated WAV as a raw resource.
- **Brain/commands** → same decision order; commands call Android intents
  instead of `subprocess`.
- **Silent-by-default** → identical rule.

## Testing

```bash
python -m pytest tests/ -v      # or: python tests/test_nex.py
```

All tests run without a microphone or display.
