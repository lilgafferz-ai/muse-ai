import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Toast config by type ─────────────────────────────────────────────────────
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    borderColor: "rgba(34,197,94,0.4)",
    iconColor: "#4ade80",
    bgAccent: "rgba(34,197,94,0.08)",
    label: "Success",
  },
  error: {
    icon: XCircle,
    borderColor: "rgba(239,68,68,0.4)",
    iconColor: "#f87171",
    bgAccent: "rgba(239,68,68,0.08)",
    label: "Error",
  },
  info: {
    icon: Info,
    borderColor: "rgba(59,130,246,0.4)",
    iconColor: "#60a5fa",
    bgAccent: "rgba(59,130,246,0.08)",
    label: "Info",
  },
  warn: {
    icon: AlertTriangle,
    borderColor: "rgba(245,158,11,0.4)",
    iconColor: "#fbbf24",
    bgAccent: "rgba(245,158,11,0.08)",
    label: "Warning",
  },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const { id, type, message, exiting } = toast;
  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  return (
    <div
      className={exiting ? "animate-toast-out" : "animate-toast-in"}
      onClick={() => onDismiss(id)}
      style={{
        pointerEvents: "all",
        minWidth: "280px",
        maxWidth: "380px",
        background: "rgba(15,10,30,0.97)",
        border: `1px solid ${config.borderColor}`,
        borderRadius: "14px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Accent strip on left */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: config.iconColor,
          borderRadius: "14px 0 0 14px",
          opacity: 0.8,
        }}
      />

      {/* Icon */}
      <div
        className="flex-center flex-shrink-0 w-8 h-8 rounded-lg mt-0.5"
        style={{ background: config.bgAccent }}
      >
        <Icon size={16} style={{ color: config.iconColor }} />
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold mb-0.5 uppercase tracking-wide"
          style={{ color: config.iconColor }}
        >
          {config.label}
        </p>
        <p className="text-sm leading-snug break-words" style={{ color: "rgba(255,255,255,0.82)" }}>
          {message}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(id); }}
        className="flex-shrink-0 flex-center w-6 h-6 rounded-md transition-all duration-150"
        style={{ color: "rgba(255,255,255,0.3)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── ToastContainer ───────────────────────────────────────────────────────────
export function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

// ─── ToastProvider ────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    // Mark as exiting for animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback(
    (type, message, duration = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, message, exiting: false }]);
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const success = useCallback((msg, dur) => addToast("success", msg, dur), [addToast]);
  const error   = useCallback((msg, dur) => addToast("error",   msg, dur), [addToast]);
  const info    = useCallback((msg, dur) => addToast("info",    msg, dur), [addToast]);
  const warn    = useCallback((msg, dur) => addToast("warn",    msg, dur), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, dismiss, success, error, info, warn }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  const { success, error, info, warn } = ctx;
  return { success, error, info, warn };
}

export default ToastProvider;