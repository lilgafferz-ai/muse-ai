"""Wake-word listener — Nex's ears.

Design goals:
  * Idle & cheap when nothing's happening (no heavy processing on the
    main loop; STT runs in a background thread).
  * Fully offline: uses Vosk small-model keyword spotting if available.
  * Testable without a microphone: the wake-detection logic is a pure
    function, and a 'keyboard' engine lets you drive it by typing.

Flow: audio -> STT text -> `extract_command_after_wake` -> callback.
"""
from __future__ import annotations

import queue
import threading
from typing import Callable

from ..config import CONFIG


def extract_command_after_wake(
    text: str,
    aliases: tuple[str, ...],
) -> str | None:
    """If `text` contains the wake word, return everything after it.

    Returns:
        - the trailing command string (possibly "") if the wake word is present
        - None if the wake word is not present at all

    Pure function -> easy to unit test.
    """
    if not text:
        return None
    words = text.lower().replace(",", " ").split()
    alias_set = {a.lower() for a in aliases}
    for i, w in enumerate(words):
        if w.strip(".?!") in alias_set:
            return " ".join(words[i + 1:]).strip()
    return None


class WakeListener:
    """Runs an STT loop in the background and fires `on_command` when the
    wake word is heard, passing the trailing command text."""

    def __init__(
        self,
        on_command: Callable[[str], None],
        config=CONFIG,
    ) -> None:
        self.cfg = config
        self.on_command = on_command
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._inject: "queue.Queue[str]" = queue.Queue()

    # -- lifecycle --------------------------------------------------------
    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        engine = self.cfg.wake_engine
        target = self._run_vosk if engine == "vosk" else self._run_keyboard
        self._thread = threading.Thread(target=target, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._inject.put("")  # unblock keyboard/inject waits

    # -- testing / scripting hook ----------------------------------------
    def inject_transcript(self, text: str) -> None:
        """Feed a transcript as if the STT engine produced it. Used by the
        keyboard engine and by tests."""
        self._inject.put(text)

    def _handle_transcript(self, text: str) -> None:
        cmd = extract_command_after_wake(text, tuple(self.cfg.wake_aliases))
        if cmd is not None:
            self.on_command(cmd)

    # -- engines ----------------------------------------------------------
    def _run_keyboard(self) -> None:
        """Dev/testing engine: pulls transcripts from the inject queue."""
        while not self._stop.is_set():
            try:
                text = self._inject.get(timeout=0.25)
            except queue.Empty:
                continue
            if self._stop.is_set():
                break
            self._handle_transcript(text)

    def _run_vosk(self) -> None:
        """Offline STT engine using Vosk + sounddevice. Falls back to the
        keyboard engine if the dependencies or model are missing."""
        try:
            import json
            import sounddevice as sd  # type: ignore
            from vosk import Model, KaldiRecognizer  # type: ignore
        except Exception:
            # dependencies not installed -> degrade to keyboard engine
            self._run_keyboard()
            return

        try:
            model = Model(self.cfg.vosk_model_path)
        except Exception:
            self._run_keyboard()
            return

        rec = KaldiRecognizer(model, self.cfg.sample_rate)
        q: "queue.Queue[bytes]" = queue.Queue()

        def _cb(indata, frames, time_, status):  # noqa: ANN001
            q.put(bytes(indata))

        with sd.RawInputStream(
            samplerate=self.cfg.sample_rate, blocksize=8000, dtype="int16",
            channels=1, callback=_cb,
        ):
            while not self._stop.is_set():
                try:
                    data = q.get(timeout=0.25)
                except queue.Empty:
                    continue
                if rec.AcceptWaveform(data):
                    text = json.loads(rec.Result()).get("text", "")
                    if text:
                        self._handle_transcript(text)
