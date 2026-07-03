#!/usr/bin/env python3
"""Entry point for Nex.

    python run_nex.py            # start Nex (needs mic + tkinter for the full show)
    python run_nex.py --demo     # type transcripts instead of speaking (no mic)

The --demo mode is perfect for trying Nex on any machine: type things like
'nex what time is it' or 'nex open browser' and watch it react.
"""
from __future__ import annotations

import sys

from nex.app import Nex
from nex.config import CONFIG


def demo() -> None:
    CONFIG.wake_engine = "keyboard"   # drive by typing
    nex = Nex(CONFIG)
    if nex.overlay is not None:
        nex.overlay.start()
    nex.listener.start()
    print("=== Nex demo ===")
    print(f"Type transcripts. Start with the wake word '{CONFIG.wake_word}'.")
    print("Examples: 'nex what time is it'  |  'nex open browser'  |  'quit'")
    try:
        while True:
            line = input("> ").strip()
            if line.lower() in ("quit", "exit"):
                break
            nex.listener.inject_transcript(line)
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        nex.stop()


def main() -> None:
    if "--demo" in sys.argv:
        demo()
    else:
        Nex(CONFIG).run()


if __name__ == "__main__":
    main()
