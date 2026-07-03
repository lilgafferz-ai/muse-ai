"""Command registry — Nex's hands.

A command is a plugin: a name, some trigger phrases, and a handler that
returns a CommandResult. The brain matches user text to a command; the
runtime executes it. Silent-by-default means most commands return
speak="" and just act.

Add new abilities by decorating a function with @command(...). Nothing
else in the codebase needs to change.
"""
from __future__ import annotations

import datetime as _dt
import platform
import re
import shutil
import subprocess
import webbrowser
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class CommandResult:
    """What a command hands back to the runtime."""
    handled: bool = True
    # text to speak aloud. Empty string => stay silent (the default).
    speak: str = ""
    # machine-readable payload for logs / chaining
    data: dict = field(default_factory=dict)


@dataclass
class Command:
    name: str
    triggers: tuple[str, ...]
    handler: Callable[["CommandContext"], CommandResult]
    # is this a *question* the user asked? questions always get spoken answers
    is_query: bool = False
    help: str = ""


@dataclass
class CommandContext:
    """Everything a handler might need."""
    text: str                 # the raw command text (wake word stripped)
    tokens: list[str]         # lowercased word tokens
    args: str = ""            # the command text with the trigger removed


class Registry:
    def __init__(self) -> None:
        self._commands: list[Command] = []

    def add(self, cmd: Command) -> None:
        self._commands.append(cmd)

    def all(self) -> list[Command]:
        return list(self._commands)

    def match(self, text: str) -> tuple[Command, str] | None:
        """Return (command, args) for the best trigger match, else None."""
        low = text.lower().strip()
        best: tuple[Command, str, int] | None = None
        for cmd in self._commands:
            for trig in cmd.triggers:
                span = _trigger_span(trig, low)
                if span is not None:
                    # prefer the longest trigger match (most specific)
                    start, end = span
                    args = (low[:start] + low[end:]).strip()
                    score = len(trig)
                    if best is None or score > best[2]:
                        best = (cmd, args, score)
        if best:
            return best[0], best[1]
        return None


def _trigger_span(trig: str, low: str) -> tuple[int, int] | None:
    """Locate a whole-word occurrence of `trig` in `low`.

    Word boundaries stop 'the time' from firing inside 'timeline'. A
    trailing space in the trigger means it needs arguments after it, so
    'open ' matches 'open browser' but not a bare 'open'.
    """
    pat = r"\b" + re.escape(trig.rstrip())
    pat += r"\s+(?=\S)" if trig.endswith(" ") else r"\b"
    m = re.search(pat, low)
    return (m.start(), m.end()) if m else None


REGISTRY = Registry()


def command(*triggers: str, is_query: bool = False, help: str = ""):
    """Decorator to register a command handler."""
    def deco(fn: Callable[[CommandContext], CommandResult]) -> Callable:
        REGISTRY.add(Command(
            name=fn.__name__,
            triggers=tuple(t.lower() for t in triggers),
            handler=fn,
            is_query=is_query,
            help=help or (fn.__doc__ or "").strip(),
        ))
        return fn
    return deco


# --------------------------------------------------------------------------
# Built-in commands
# --------------------------------------------------------------------------

@command("what time", "the time", "current time", is_query=True,
         help="Tell the current time.")
def cmd_time(ctx: CommandContext) -> CommandResult:
    now = _dt.datetime.now().strftime("%-I:%M %p") if platform.system() != "Windows" \
        else _dt.datetime.now().strftime("%I:%M %p").lstrip("0")
    return CommandResult(speak=f"It's {now}.", data={"time": now})


@command("what day", "what's the date", "today's date", "the date", is_query=True,
         help="Tell today's date.")
def cmd_date(ctx: CommandContext) -> CommandResult:
    today = _dt.date.today().strftime("%A, %B %d")
    return CommandResult(speak=f"Today is {today}.", data={"date": today})


@command("open ", help="Open an application or website. e.g. 'Nex, open browser'.")
def cmd_open(ctx: CommandContext) -> CommandResult:
    target = ctx.args.strip()
    if not target:
        return CommandResult(speak="Open what?", data={})
    # website?
    if "." in target and " " not in target:
        url = target if target.startswith("http") else "https://" + target
        webbrowser.open(url)
        return CommandResult(speak="", data={"opened": url})
    # known aliases -> best-effort app launch
    launched = _launch_app(target)
    if launched:
        return CommandResult(speak="", data={"opened": target})
    # fall back to a web search for the phrase
    webbrowser.open("https://www.google.com/search?q=" + target.replace(" ", "+"))
    return CommandResult(speak="", data={"searched": target})


@command("search for ", "look up ", "google ",
         help="Web search for a phrase.")
def cmd_search(ctx: CommandContext) -> CommandResult:
    q = ctx.args.strip()
    if not q:
        return CommandResult(speak="Search for what?")
    webbrowser.open("https://www.google.com/search?q=" + q.replace(" ", "+"))
    return CommandResult(speak="", data={"searched": q})


@command("what can you do", "help", "list commands", is_query=True,
         help="List available commands.")
def cmd_help(ctx: CommandContext) -> CommandResult:
    names = ", ".join(sorted({c.name.replace("cmd_", "") for c in REGISTRY.all()}))
    return CommandResult(speak=f"I can handle: {names}.", data={"commands": names})


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

_APP_ALIASES = {
    "browser": {"Windows": "start chrome", "Darwin": "open -a Safari",
                "Linux": "xdg-open https://"},
    "notepad": {"Windows": "notepad", "Darwin": "open -a TextEdit",
                "Linux": "gedit"},
    "calculator": {"Windows": "calc", "Darwin": "open -a Calculator",
                   "Linux": "gnome-calculator"},
    "terminal": {"Windows": "start cmd", "Darwin": "open -a Terminal",
                 "Linux": "x-terminal-emulator"},
    "files": {"Windows": "explorer", "Darwin": "open .", "Linux": "xdg-open ."},
}


def _launch_app(name: str) -> bool:
    sysname = platform.system()
    key = name.lower().strip()
    cmd = None
    if key in _APP_ALIASES:
        cmd = _APP_ALIASES[key].get(sysname)
    if not cmd:
        # try the name as a raw executable
        if shutil.which(key):
            cmd = key
    if not cmd:
        return False
    try:
        subprocess.Popen(cmd, shell=True)
        return True
    except Exception:
        return False
