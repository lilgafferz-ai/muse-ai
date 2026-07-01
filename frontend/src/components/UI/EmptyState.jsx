import { useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";

// ─── EmptyState ───────────────────────────────────────────────────────────────
export default function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  actionLabel = "Get Started",
  className = "",
}) {
  const glowRef = useRef(null);

  // Subtle breathing glow animation on mount
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    let frame;
    let t = 0;
    const animate = () => {
      t += 0.02;
      const scale = 1 + 0.06 * Math.sin(t);
      const opacity = 0.12 + 0.06 * Math.sin(t * 0.7);
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      el.style.opacity = opacity;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${className}`}
      style={{ padding: "64px 32px", minHeight: "280px", position: "relative" }}
    >
      {/* Ambient glow blob */}
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.06) 50%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 0,
          willChange: "transform, opacity",
        }}
      />

      {/* Icon container */}
      <div
        className="animate-scale-in"
        style={{ position: "relative", zIndex: 1, marginBottom: "24px" }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {IconComponent && (
            <IconComponent
              size={36}
              style={{ color: "rgba(255,255,255,0.15)", strokeWidth: 1.25 }}
            />
          )}
        </div>
      </div>

      {/* Title */}
      {title && (
        <h3
          className="animate-slide-up text-base font-semibold mb-2"
          style={{
            color: "rgba(255,255,255,0.65)",
            position: "relative",
            zIndex: 1,
            animationDelay: "60ms",
            animationFillMode: "both",
          }}
        >
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p
          className="animate-slide-up text-sm leading-relaxed max-w-xs"
          style={{
            color: "rgba(255,255,255,0.3)",
            position: "relative",
            zIndex: 1,
            animationDelay: "100ms",
            animationFillMode: "both",
            marginBottom: action ? "28px" : "0",
          }}
        >
          {description}
        </p>
      )}

      {/* CTA Button */}
      {action && (
        <button
          onClick={action}
          className="btn-secondary animate-slide-up"
          style={{
            position: "relative",
            zIndex: 1,
            animationDelay: "140ms",
            animationFillMode: "both",
          }}
        >
          <span>{actionLabel}</span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}