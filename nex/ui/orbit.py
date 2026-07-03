"""The orbiting glow — Nex's face.

A small, always-on-top, frameless, click-through-ish window showing a
glowing dot that orbits a centre point while Nex is listening or acting.
Hidden entirely when idle (so it isn't a battery/CPU hog).

Uses tkinter (stdlib) so there's zero install cost. On a headless box it
no-ops gracefully. The orbit maths is separated into `orbit_position` so
it can be unit-tested without a display server.

NOTE: this is the desktop reference implementation. On Android the same
behaviour is a SYSTEM_ALERT_WINDOW overlay drawn with a Canvas/Compose —
the geometry below ports directly.
"""
from __future__ import annotations

import math
import threading


def orbit_position(t: float, radius: int, speed: float) -> tuple[float, float]:
    """Return (dx, dy) offset of the dot from centre at time `t` seconds.

    Pure function -> testable without a GUI.
    """
    angle = t * speed
    return radius * math.cos(angle), radius * math.sin(angle)


class OrbitOverlay:
    def __init__(self, config) -> None:
        self.cfg = config
        self._root = None
        self._canvas = None
        self._dot = None
        self._glow = None
        self._t = 0.0
        self._visible = False        # requested state (set from any thread)
        self._shown = False          # actual window state (Tk thread only)
        self._stop_requested = False
        self._thread: threading.Thread | None = None
        self._available = False

    # -- setup ------------------------------------------------------------
    def _build(self) -> bool:
        try:
            import tkinter as tk
        except Exception:
            return False
        try:
            size = self.cfg.orbit_radius * 2 + self.cfg.orbit_dot_size * 2 + 20
            self._tk = tk
            root = tk.Tk()
            root.overrideredirect(True)          # frameless
            root.attributes("-topmost", True)     # always on top
            try:
                root.attributes("-transparentcolor", "black")  # Windows
            except Exception:
                root.attributes("-alpha", 0.92)   # other platforms
            root.configure(bg="black")
            # bottom-right by default
            sw = root.winfo_screenwidth()
            sh = root.winfo_screenheight()
            root.geometry(f"{size}x{size}+{sw - size - 30}+{sh - size - 80}")

            canvas = tk.Canvas(root, width=size, height=size,
                               bg="black", highlightthickness=0)
            canvas.pack()

            self._root, self._canvas, self._size = root, canvas, size
            self._center = size / 2
            root.withdraw()      # start hidden (idle)
            return True
        except Exception:
            return False

    # -- lifecycle --------------------------------------------------------
    def start(self) -> None:
        """Build and run the Tk loop on its own thread."""
        def _run():
            if not self._build():
                return
            self._available = True
            self._tick()
            try:
                self._root.mainloop()
            except Exception:
                pass
        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()

    def _tick(self) -> None:
        if self._root is None:
            return
        if self._stop_requested:
            try:
                self._root.quit()
            except Exception:
                pass
            return
        # tkinter may only be driven from the thread running its mainloop,
        # so requested visibility changes are applied here, not in show/hide
        if self._visible != self._shown:
            try:
                if self._visible:
                    self._root.deiconify()
                else:
                    self._root.withdraw()
                self._shown = self._visible
            except Exception:
                pass
        if self._visible:
            self._t += 0.033
            self._draw()
        self._root.after(33, self._tick)   # ~30 fps

    def _draw(self) -> None:
        c = self._canvas
        c.delete("orbit")
        dx, dy = orbit_position(self._t, self.cfg.orbit_radius,
                                self.cfg.orbit_speed)
        cx, cy = self._center + dx, self._center + dy
        r = self.cfg.orbit_dot_size / 2
        color = self.cfg.orbit_color
        # layered glow
        for i, mult in enumerate((2.6, 1.9, 1.3)):
            c.create_oval(cx - r * mult, cy - r * mult,
                          cx + r * mult, cy + r * mult,
                          outline="", fill=_dim(color, 0.15 * (3 - i)),
                          tags="orbit")
        c.create_oval(cx - r, cy - r, cx + r, cy + r,
                      outline="", fill=color, tags="orbit")

    # -- state ------------------------------------------------------------
    # show/hide/stop only flip flags, so they are safe to call from any
    # thread; the Tk thread picks the change up in _tick within ~33 ms.
    def show(self) -> None:
        """Wake the orbit (Nex is listening/active)."""
        self._visible = True

    def hide(self) -> None:
        """Return to idle — overlay disappears entirely."""
        self._visible = False

    def stop(self) -> None:
        self._stop_requested = True


def _dim(hex_color: str, factor: float) -> str:
    """Blend a hex colour toward black by `factor` (0=black, 1=full)."""
    factor = max(0.0, min(1.0, factor))
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    r, g, b = (int(v * factor) for v in (r, g, b))
    return f"#{r:02x}{g:02x}{b:02x}"
