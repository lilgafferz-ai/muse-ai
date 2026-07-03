"""The brain — decides what a heard utterance means and what to do.

Decision order (fast to slow, offline to online):
  1. Command match        — deterministic, instant, offline.
  2. Local LLM (optional)  — for open questions, if a GGUF model is set.
  3. Cloud fallback        — only if online AND explicitly allowed.
  4. Give up gracefully.

Silent-by-default rule lives here: if the utterance is not a question and
a command handled it, Nex says nothing.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..config import CONFIG
from . import commands as cmds


@dataclass
class Decision:
    """The brain's verdict for one utterance."""
    action: str          # "command" | "answer" | "clarify" | "ignore"
    speak: str = ""      # what to say aloud (may be "")
    command: str = ""    # command name, if any
    data: dict | None = None


# question words that force a spoken reply even without a registered query cmd
_QUESTION_STARTERS = (
    "what", "who", "when", "where", "why", "how", "which", "whose",
    "is", "are", "can", "could", "do", "does", "did", "should", "would",
    "will", "tell me", "explain",
)


def _looks_like_question(text: str) -> bool:
    t = text.lower().strip().rstrip("?.! ")
    if text.strip().endswith("?"):
        return True
    return any(t.startswith(q + " ") or t == q for q in _QUESTION_STARTERS)


class Brain:
    def __init__(self, config=CONFIG) -> None:
        self.cfg = config
        self._llm = None
        if config.local_model_path:
            self._llm = _try_load_llm(config)

    # -- main entry -------------------------------------------------------
    def decide(self, text: str) -> Decision:
        text = (text or "").strip()
        if not text:
            return Decision(action="ignore")

        # 1) command match
        match = cmds.REGISTRY.match(text)
        if match:
            cmd, args = match
            ctx = cmds.CommandContext(
                text=text, tokens=text.lower().split(), args=args)
            result = cmd.handler(ctx)
            if result.handled:
                # silent-by-default: only speak for queries or when the
                # command explicitly asked to (e.g. needs clarification)
                speak = result.speak
                if self.cfg.silent_by_default and not cmd.is_query:
                    # keep clarifications/questions, drop chit-chat
                    if not speak.endswith("?"):
                        speak = ""
                return Decision(action="command", speak=speak,
                                command=cmd.name, data=result.data)

        # 2) open question -> local LLM
        if _looks_like_question(text):
            if self._llm is not None:
                answer = self._ask_llm(text)
                if answer:
                    return Decision(action="answer", speak=answer)
            # 3) cloud fallback
            if self.cfg.allow_cloud_fallback and self.cfg.cloud_endpoint:
                answer = _ask_cloud(self.cfg, text)
                if answer:
                    return Decision(action="answer", speak=answer)
            return Decision(
                action="clarify",
                speak="I don't have an answer for that offline yet.")

        # not a question, no command matched, stay silent
        return Decision(action="ignore")

    # -- local model ------------------------------------------------------
    def _ask_llm(self, text: str) -> str:
        try:
            out = self._llm(
                f"[INST] Answer briefly and helpfully.\n{text} [/INST]",
                max_tokens=160,
                stop=["</s>", "[INST]"],
                echo=False,
            )
            return out["choices"][0]["text"].strip()
        except Exception:
            return ""


def _try_load_llm(config):
    """Load a local GGUF model via llama-cpp-python if available."""
    try:
        from llama_cpp import Llama  # type: ignore
        return Llama(
            model_path=config.local_model_path,
            n_ctx=config.local_model_ctx,
            n_threads=config.local_model_threads,
            verbose=False,
        )
    except Exception:
        return None


def _ask_cloud(config, text: str) -> str:
    """Optional online fallback. Kept dependency-free and best-effort."""
    try:
        import json
        import urllib.request
        req = urllib.request.Request(
            config.cloud_endpoint,
            data=json.dumps({"prompt": text}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode())
        return payload.get("text", "").strip()
    except Exception:
        return ""
