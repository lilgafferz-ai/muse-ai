import { useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";

// ─── Size map ─────────────────────────────────────────────────────────────────
const SIZE_MAP = {
  sm: "400px",
  md: "560px",
  lg: "720px",
  xl: "900px",
};

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
}) {
  const overlayRef = useRef(null);
  const maxWidth = SIZE_MAP[size] || SIZE_MAP.md;

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="animate-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        className="animate-scale-in flex flex-col"
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "calc(100vh - 64px)",
          background: "rgba(15,10,30,0.97)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: "20px",
          boxShadow:
            "0 32px 96px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08), 0 0 60px rgba(139,92,246,0.06)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            {/* Accent dot */}
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "linear-gradient(135deg,#a78bfa,#818cf8)",
                boxShadow: "0 0 8px rgba(167,139,250,0.5)",
                flexShrink: 0,
              }}
            />
            <h2
              className="text-base font-semibold"
              style={{ color: "rgba(255,255,255,0.92)", margin: 0 }}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-center w-8 h-8 rounded-lg transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.12)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "rgba(255,255,255,0.4)";
            }}
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5"
          style={{ minHeight: 0 }}
        >
          {children}
        </div>

        {/* ── Footer (optional) ──────────────────────────────────────────── */}
        {footer && (
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}