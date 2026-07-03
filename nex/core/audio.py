"""Audio cues — the 'tundum' Nex makes when it wakes.

We generate the sound procedurally (no shipped binary blobs) the first
time it's needed, then play it. Playback tries, in order: simpleaudio,
the winsound stdlib module (Windows), then aplay/afplay CLI. If none are
available it degrades silently — Nex should never crash over a beep.
"""
from __future__ import annotations

import math
import struct
import wave
from pathlib import Path


def generate_tundum(path: str | Path, sample_rate: int = 16000) -> Path:
    """Write a short two-note 'tun-dum' chime to `path` as a WAV.

    'tun'  -> higher note, quick
    'dum'  -> lower note, with a soft decay
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    def note(freq: float, dur: float, decay: float = 6.0):
        n = int(sample_rate * dur)
        for i in range(n):
            t = i / sample_rate
            env = math.exp(-decay * t)          # exponential fade
            # blend fundamental + soft octave for a fuller tone
            s = 0.6 * math.sin(2 * math.pi * freq * t)
            s += 0.2 * math.sin(2 * math.pi * freq * 2 * t)
            yield s * env

    samples: list[float] = []
    samples += list(note(660.0, 0.12, decay=9.0))   # "tun"
    samples += [0.0] * int(sample_rate * 0.02)       # tiny gap
    samples += list(note(392.0, 0.28, decay=5.0))    # "dum"

    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        frames = b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767 * 0.9))
            for s in samples
        )
        w.writeframes(frames)
    return path


def play(path: str | Path) -> bool:
    """Play a WAV file. Returns True if a backend handled it."""
    path = str(path)
    # 1) simpleaudio (cross-platform, non-blocking-ish)
    try:
        import simpleaudio  # type: ignore
        wave_obj = simpleaudio.WaveObject.from_wave_file(path)
        wave_obj.play()
        return True
    except Exception:
        pass
    # 2) winsound (Windows stdlib)
    try:
        import winsound  # type: ignore
        winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_ASYNC)
        return True
    except Exception:
        pass
    # 3) CLI players
    import shutil
    import subprocess
    for player in ("afplay", "aplay", "paplay"):
        if shutil.which(player):
            try:
                subprocess.Popen([player, path],
                                 stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL)
                return True
            except Exception:
                continue
    return False


def ensure_and_play(path: str | Path, sample_rate: int = 16000) -> bool:
    p = Path(path)
    if not p.exists():
        try:
            generate_tundum(p, sample_rate)
        except Exception:
            return False
    return play(p)
