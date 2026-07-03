"""Nex orchestrator — the loop that ties ears, brain, mouth, and face.

Lifecycle:
  idle (overlay hidden, listener running quietly)
    -> hears "Nex ..."  -> tundum sound + overlay appears
    -> brain decides    -> command runs / question answered
    -> speaks only if the brain returned speech (silent by default)
    -> lingers briefly, then back to idle.
"""
from __future__ import annotations

import threading
import time

from .config import CONFIG
from .core import audio
from .core.brain import Brain
from .core.commands import CommandContext, REGISTRY
from .core.voice import Voice
from .core.wake import WakeListener
from .ui.orbit import OrbitOverlay


class Nex:
    def __init__(self, config=CONFIG) -> None:
        self.cfg = config
        self.brain = Brain(config)
        self.voice = Voice(
            config.tts_rate, config.tts_voice, config.tts_enabled,
            engine=config.tts_engine, gender=config.tts_gender,
            volume=config.tts_volume, piper_model_path=config.piper_model_path,
        )
        self.overlay = OrbitOverlay(config) if config.orbit_enabled else None
        self.listener = WakeListener(self._on_command, config)
        self._busy = threading.Lock()

    # -- wake callback ----------------------------------------------------
    def _on_command(self, command_text: str) -> None:
        # runs on the listener thread: hand the work to a worker thread so
        # slow commands / TTS never stall wake-word detection
        if not self._busy.acquire(blocking=False):
            return   # non-reentrant: ignore overlapping triggers
        threading.Thread(
            target=self._handle_command, args=(command_text,), daemon=True,
        ).start()

    def _handle_command(self, command_text: str) -> None:
        try:
            self._activate()
            if not command_text.strip():
                # user just said "Nex" with no command -> wait, don't speak
                return
            decision = self.brain.decide(command_text)
            if decision.speak:
                self.voice.say(decision.speak)
        finally:
            time.sleep(self.cfg.active_linger)
            self._deactivate()
            self._busy.release()

    # -- state transitions ------------------------------------------------
    def _activate(self) -> None:
        if self.cfg.tundum_enabled:
            audio.ensure_and_play(self.cfg.tundum_path, self.cfg.sample_rate)
        if self.overlay is not None:
            self.overlay.show()

    def _deactivate(self) -> None:
        if self.overlay is not None:
            self.overlay.hide()

    # -- run --------------------------------------------------------------
    def run(self) -> None:
        if self.overlay is not None:
            self.overlay.start()
        self.listener.start()
        print(f"Nex is listening. Say '{self.cfg.wake_word}' to wake me.")
        print("(silent by default — I only speak when you ask a question)")
        try:
            while True:
                time.sleep(0.5)
        except KeyboardInterrupt:
            self.stop()

    def stop(self) -> None:
        self.listener.stop()
        if self.overlay is not None:
            self.overlay.stop()
        print("Nex stopped.")


def main() -> None:
    Nex().run()


if __name__ == "__main__":
    main()
