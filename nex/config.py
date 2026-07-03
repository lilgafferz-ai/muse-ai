"""Central configuration for Nex.

Everything tunable lives here so the rest of the code stays boring.
Values can be overridden with a nex.config.json file next to this package
or via environment variables prefixed with NEX_.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict, field
from pathlib import Path

_CONFIG_FILE = Path(__file__).resolve().parent.parent / "nex.config.json"


@dataclass
class Config:
    # --- Wake word ---
    wake_word: str = "nex"
    # extra spellings the STT engine might hear for "nex"
    wake_aliases: tuple[str, ...] = ("nex", "next", "nexus", "necks", "nix")

    # --- Behaviour ---
    # Nex stays silent unless (a) you ask a question, or (b) it needs to ask you.
    silent_by_default: bool = True
    # seconds to keep listening for a command after the wake word
    command_timeout: float = 8.0
    # seconds of overlay "cool down" spin after a command finishes
    active_linger: float = 1.5

    # --- Audio ---
    sample_rate: int = 16000
    tundum_enabled: bool = True
    tundum_path: str = "assets/tundum.wav"  # generated if missing

    # --- Speech (Nex's voice: soft, smooth, female) ---
    tts_enabled: bool = True
    # "auto" -> use Piper neural voice if configured, else a female system voice
    # "piper" -> force offline neural voice (needs piper + a voice model)
    # "system" -> force pyttsx3 system voice
    tts_engine: str = "auto"
    tts_gender: str = "female"        # bias system-voice selection
    tts_rate: int = 158               # a touch slower = softer, less robotic
    tts_volume: float = 0.9           # gentle, not shouting
    tts_voice: str | None = None      # explicit voice id/name; None = auto-pick
    # Offline neural voice (recommended for a genuinely human 'gal' sound).
    # Grab a warm female Piper model (e.g. en_US-amy / en_US-hfc_female) and
    # point this at the .onnx file.
    piper_model_path: str = "models/piper/en_US-amy-medium.onnx"

    # --- Offline brain ---
    # path to a local GGUF model for llama.cpp; empty = rule-based brain only
    local_model_path: str = ""
    local_model_threads: int = 4
    local_model_ctx: int = 2048

    # --- Cloud fallback (only used if online AND allowed) ---
    allow_cloud_fallback: bool = False
    cloud_endpoint: str = ""

    # --- UI overlay ---
    orbit_enabled: bool = True
    orbit_radius: int = 40          # px the dot travels around its centre
    orbit_dot_size: int = 18        # px diameter of the glowing dot
    orbit_speed: float = 2.4        # radians / second
    orbit_color: str = "#00e5ff"

    # --- Wake engine selection ---
    # "vosk" (offline STT keyword spotting) or "keyboard" (dev/testing fallback)
    wake_engine: str = "vosk"
    vosk_model_path: str = "models/vosk-small"

    def save(self, path: Path | None = None) -> None:
        path = path or _CONFIG_FILE
        path.write_text(json.dumps(asdict(self), indent=2))

    @classmethod
    def load(cls) -> "Config":
        cfg = cls()
        if _CONFIG_FILE.exists():
            data = json.loads(_CONFIG_FILE.read_text())
            for k, v in data.items():
                if hasattr(cfg, k):
                    setattr(cfg, k, v)
        # environment overrides
        for f in cfg.__dataclass_fields__:
            env = os.environ.get("NEX_" + f.upper())
            if env is not None:
                cur = getattr(cfg, f)
                try:
                    if isinstance(cur, bool):
                        setattr(cfg, f, env.lower() in ("1", "true", "yes", "on"))
                    elif isinstance(cur, int):
                        setattr(cfg, f, int(env))
                    elif isinstance(cur, float):
                        setattr(cfg, f, float(env))
                    else:
                        setattr(cfg, f, env)
                except ValueError:
                    pass
        return cfg


CONFIG = Config.load()
