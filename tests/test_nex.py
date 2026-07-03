"""Tests for Nex core logic — all runnable headless (no mic, no display)."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nex.config import Config
from nex.core import audio
from nex.core.brain import Brain, _looks_like_question
from nex.core.voice import Voice, pick_female_voice
from nex.core.wake import extract_command_after_wake
from nex.ui.orbit import orbit_position, _dim


# --------------------------------------------------------------------------
# wake-word extraction
# --------------------------------------------------------------------------
ALIASES = ("nex", "next", "nexus", "necks", "nix")


def test_wake_present_with_command():
    assert extract_command_after_wake("nex what time is it", ALIASES) == "what time is it"


def test_wake_present_bare():
    # just the wake word -> empty command string (not None)
    assert extract_command_after_wake("nex", ALIASES) == ""


def test_wake_alias_matches():
    assert extract_command_after_wake("hey next open browser", ALIASES) == "open browser"


def test_wake_absent_returns_none():
    assert extract_command_after_wake("what time is it", ALIASES) is None


def test_wake_handles_punctuation():
    assert extract_command_after_wake("Nex, open browser", ALIASES) == "open browser"


def test_wake_empty_text():
    assert extract_command_after_wake("", ALIASES) is None


# --------------------------------------------------------------------------
# question detection
# --------------------------------------------------------------------------
def test_question_detection():
    assert _looks_like_question("what is the capital of France")
    assert _looks_like_question("open the door?")
    assert not _looks_like_question("open browser")
    assert not _looks_like_question("play music")


# --------------------------------------------------------------------------
# brain decisions (silent-by-default)
# --------------------------------------------------------------------------
def _brain() -> Brain:
    cfg = Config()
    cfg.local_model_path = ""          # rule-based only
    cfg.allow_cloud_fallback = False
    return Brain(cfg)


def test_brain_query_speaks():
    d = _brain().decide("what time is it")
    assert d.action == "command"
    assert d.speak                      # queries get spoken answers
    assert "time" in d.command.lower()


def test_brain_command_is_silent():
    import nex.core.commands as cmds
    real = cmds._launch_app
    cmds._launch_app = lambda name: True   # don't launch real apps in tests
    try:
        d = _brain().decide("open browser")
        assert d.action == "command"
        assert d.speak == ""                # silent by default for actions
    finally:
        cmds._launch_app = real


def test_brain_ignores_noise():
    d = _brain().decide("blah blah nonsense")
    assert d.action == "ignore"
    assert d.speak == ""


def test_brain_unknown_question_clarifies():
    d = _brain().decide("why is the sky blue")
    assert d.action == "clarify"
    assert d.speak                      # tells you it can't answer offline


def test_brain_empty_ignored():
    assert _brain().decide("").action == "ignore"


# --------------------------------------------------------------------------
# trigger matching (word boundaries)
# --------------------------------------------------------------------------
def test_trigger_respects_word_boundaries():
    from nex.core.commands import REGISTRY
    # 'the time' must not fire inside the word 'timeline'
    assert REGISTRY.match("update the timeline for me") is None


def test_trigger_open_requires_a_target():
    from nex.core.commands import REGISTRY
    cmd, args = REGISTRY.match("open browser")
    assert cmd.name == "cmd_open"
    assert args == "browser"
    # a bare 'open' with nothing after it is not the open command
    assert REGISTRY.match("open") is None


# --------------------------------------------------------------------------
# orbit geometry
# --------------------------------------------------------------------------
def test_orbit_start_position():
    dx, dy = orbit_position(0.0, 40, 2.4)
    assert round(dx, 3) == 40.0
    assert round(dy, 3) == 0.0


def test_orbit_stays_on_circle():
    import math
    for t in (0.1, 0.5, 1.0, 2.0, 3.3):
        dx, dy = orbit_position(t, 40, 2.4)
        assert round(math.hypot(dx, dy), 3) == 40.0   # radius preserved


def test_dim_colors():
    assert _dim("#00e5ff", 0.0) == "#000000"
    assert _dim("#00e5ff", 1.0) == "#00e5ff"


# --------------------------------------------------------------------------
# tundum audio generation
# --------------------------------------------------------------------------
def test_tundum_generation(tmp_path):
    import wave
    out = tmp_path / "tundum.wav"
    audio.generate_tundum(out, sample_rate=16000)
    assert out.exists()
    with wave.open(str(out)) as w:
        assert w.getframerate() == 16000
        assert w.getnframes() > 0        # actually produced sound


# --------------------------------------------------------------------------
# voice: female voice selection (soft, smooth gal)
# --------------------------------------------------------------------------
def test_picks_female_over_male():
    voices = ["Microsoft David Desktop - English (male)",
              "Microsoft Zira Desktop - English (female)"]
    assert pick_female_voice(voices) == 1


def test_picks_macos_female_name():
    voices = ["Alex", "Daniel", "Samantha"]
    assert pick_female_voice(voices) == 2


def test_no_female_returns_none():
    assert pick_female_voice(["Alex", "Daniel", "Fred"]) is None


def test_empty_voice_list():
    assert pick_female_voice([]) is None


def test_voice_disabled_is_silent_backend():
    v = Voice(enabled=False)
    assert v.backend == "print"      # nothing initialized when disabled


def test_voice_config_defaults_female_and_soft():
    cfg = Config()
    assert cfg.tts_gender == "female"
    assert cfg.tts_rate < 175        # slower than the old robotic default
    assert 0.0 < cfg.tts_volume <= 1.0


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-v"]))
