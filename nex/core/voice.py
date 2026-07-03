"""Voice output — Nex's mouth. Soft, smooth, and female.

Two ways to sound like a real gal instead of a 1998 GPS:

  1. Piper (offline neural TTS)  -> genuinely human, warm, natural.
     Best option. Needs `pip install piper-tts` and a female voice model
     (e.g. en_US-amy-medium.onnx) at config.piper_model_path.

  2. System TTS (pyttsx3)        -> zero install, works everywhere, but
     robotic. We auto-pick a FEMALE system voice and slow it down a touch
     so it's as soft as a system voice gets.

Engine choice (config.tts_engine): "auto" tries Piper, falls back to
system, falls back to printing (so headless boxes still run). Nex stays
silent by default — this only fires when the brain returns speech.
"""
from __future__ import annotations

import re

# Whole-word hints that identify a female voice across platforms.
# (Matched with word boundaries so "female" never trips the "male" check.)
_FEMALE_WORDS = (
    "female", "woman", "girl",
    # Windows SAPI5
    "zira", "hazel", "susan", "linda", "heera", "catherine",
    # macOS
    "samantha", "victoria", "allison", "ava", "karen",
    "moira", "tessa", "fiona", "serena", "kate", "nicky",
)
_MALE_WORDS = ("male", "man", "david", "mark", "daniel", "alex", "fred",
               "george", "james", "guy")

# espeak / mbrola variant markers (substring match, they contain '+').
_FEMALE_MARKERS = ("+f1", "+f2", "+f3", "+f4", "+f5")
_MALE_MARKERS = ("+m1", "+m2", "+m3", "+m4", "+m5")


def _has_word(text: str, words: tuple[str, ...]) -> bool:
    return any(re.search(r"\b" + re.escape(w) + r"\b", text) for w in words)


def pick_female_voice(voice_names: list[str]) -> int | None:
    """Given a list of voice identifier strings, return the index of the
    best female match, or None if nothing looks female.

    Pure function -> unit-testable without a TTS engine installed.
    """
    scored: list[tuple[int, int]] = []
    for i, name in enumerate(voice_names):
        low = (name or "").lower()
        score = 0
        if _has_word(low, _FEMALE_WORDS) or any(m in low for m in _FEMALE_MARKERS):
            score += 2
        if _has_word(low, _MALE_WORDS) or any(m in low for m in _MALE_MARKERS):
            score -= 3
        if score > 0:
            scored.append((score, i))
    if not scored:
        return None
    scored.sort(reverse=True)
    return scored[0][1]


class Voice:
    def __init__(
        self,
        rate: int = 158,
        voice: str | None = None,
        enabled: bool = True,
        *,
        engine: str = "auto",
        gender: str = "female",
        volume: float = 0.9,
        piper_model_path: str = "",
    ) -> None:
        self.enabled = enabled
        self.rate = rate
        self.volume = volume
        self.gender = gender
        self.explicit_voice = voice
        self._backend = "print"
        self._engine = None            # pyttsx3 engine
        self._piper = None             # piper voice

        if not enabled:
            return

        want = engine.lower()
        if want in ("auto", "piper") and piper_model_path:
            self._piper = self._init_piper(piper_model_path)
            if self._piper is not None:
                self._backend = "piper"

        if self._backend != "piper" and want in ("auto", "system", "pyttsx3"):
            self._engine = self._init_pyttsx3(rate, voice, gender, volume)
            if self._engine is not None:
                self._backend = "pyttsx3"

    # -- backends ---------------------------------------------------------
    def _init_piper(self, model_path: str):
        try:
            from pathlib import Path
            if not Path(model_path).exists():
                return None
            from piper.voice import PiperVoice  # type: ignore
            return PiperVoice.load(model_path)
        except Exception:
            return None

    def _init_pyttsx3(self, rate: int, voice: str | None,
                      gender: str, volume: float):
        try:
            import pyttsx3  # type: ignore
            eng = pyttsx3.init()
            eng.setProperty("rate", rate)      # softer = slightly slower
            eng.setProperty("volume", max(0.0, min(1.0, volume)))

            voices = eng.getProperty("voices") or []
            names = [f"{getattr(v, 'name', '')} {getattr(v, 'id', '')} "
                     f"{','.join(getattr(v, 'languages', []) or [])}"
                     for v in voices]

            chosen_id = None
            if voice:                          # explicit request wins
                chosen_id = voice
            elif gender.lower() == "female":
                idx = pick_female_voice(names)
                if idx is not None:
                    chosen_id = voices[idx].id

            if chosen_id:
                try:
                    eng.setProperty("voice", chosen_id)
                except Exception:
                    pass

            # espeak trick: append +f3 variant for a higher, softer female tone
            try:
                cur = eng.getProperty("voice") or ""
                if "espeak" in cur.lower() and "+f" not in cur:
                    eng.setProperty("voice", cur + "+f3")
            except Exception:
                pass
            return eng
        except Exception:
            return None

    # -- speak ------------------------------------------------------------
    def say(self, text: str) -> None:
        text = (text or "").strip()
        if not text:
            return
        if self._backend == "piper" and self._piper is not None:
            if self._say_piper(text):
                return
        if self._backend == "pyttsx3" and self._engine is not None:
            try:
                self._engine.say(text)
                self._engine.runAndWait()
                return
            except Exception:
                pass
        print(f"[Nex speaks softly] {text}")

    def _say_piper(self, text: str) -> bool:
        """Synthesize with Piper and play it. Best-effort; returns success."""
        try:
            import io
            import wave
            buf = io.BytesIO()
            with wave.open(buf, "wb") as wav:
                # piper-tts >= 1.3 renamed synthesize(text, wav) to
                # synthesize_wav(text, wav); support both
                synth = getattr(self._piper, "synthesize_wav", None) \
                    or self._piper.synthesize
                synth(text, wav)

            # one scratch WAV per process, overwritten each utterance
            # (speech is serialized upstream, and reusing the file keeps
            # the temp dir from filling with one WAV per sentence)
            import os
            import tempfile
            from pathlib import Path
            from . import audio
            path = Path(tempfile.gettempdir()) / f"nex-piper-{os.getpid()}.wav"
            path.write_bytes(buf.getvalue())
            return audio.play(path)
        except Exception:
            return False

    @property
    def backend(self) -> str:
        """Which voice engine is actually live: piper / pyttsx3 / print."""
        return self._backend


# Nex voice: soft, smooth, female by default. Set config.tts_engine="piper"
# with a warm female model for a genuinely human sound.

