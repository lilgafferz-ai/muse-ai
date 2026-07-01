import React from 'react';

/**
 * VoiceOrb — a futuristic, glowing, floating orb shown only during a voice call.
 * Ambient background presence: it drifts and pulses gently while listening, and
 * pulses/spins faster while Nex is speaking. Purely decorative (pointer-events
 * off) so it never blocks the UI.
 */
export default function VoiceOrb({ active, speaking, listening }) {
  if (!active) return null;
  const state = speaking ? 'speaking' : listening ? 'listening' : 'idle';

  return (
    <div className="nexorb-wrap" aria-hidden="true">
      <div className={`nexorb nexorb--${state}`}>
        <div className="nexorb__halo" />
        <div className="nexorb__ring nexorb__ring--1" />
        <div className="nexorb__ring nexorb__ring--2" />
        <div className="nexorb__core" />
        <div className="nexorb__shine" />
      </div>

      <style>{`
        .nexorb-wrap {
          position: fixed; inset: 0; z-index: 30;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; overflow: hidden;
        }
        .nexorb {
          position: relative; width: 300px; height: 300px;
          animation: nexorbFloat 8s ease-in-out infinite;
          will-change: transform;
        }
        /* Soft outer glow that bleeds into the UI */
        .nexorb__halo {
          position: absolute; inset: -40%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.28), rgba(236,72,153,0.14) 45%, transparent 68%);
          filter: blur(40px);
          animation: nexorbPulse 3.4s ease-in-out infinite;
        }
        /* Glowing plasma core */
        .nexorb__core {
          position: absolute; inset: 30%;
          border-radius: 50%;
          background: radial-gradient(circle at 36% 30%, #ddd6fe, #8b5cf6 42%, #6d28d9 70%, #3b0764 100%);
          box-shadow: 0 0 50px 10px rgba(124,58,237,0.6),
                      inset 0 0 40px 6px rgba(236,72,153,0.35),
                      inset 0 0 12px 2px rgba(255,255,255,0.4);
          animation: nexorbPulse 3.4s ease-in-out infinite;
        }
        .nexorb__shine {
          position: absolute; left: 36%; top: 34%; width: 14%; height: 10%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.85), transparent 70%);
          filter: blur(2px);
        }
        /* Counter-rotating energy rings */
        .nexorb__ring {
          position: absolute; border-radius: 50%;
          background: conic-gradient(from 0deg,
            transparent, rgba(167,139,250,0.6), transparent 38%,
            rgba(236,72,153,0.55), transparent 72%, rgba(96,165,250,0.4), transparent);
          filter: blur(5px);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));
                  mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 calc(100% - 7px));
        }
        .nexorb__ring--1 { inset: 4%;  animation: nexorbSpin 13s linear infinite; }
        .nexorb__ring--2 { inset: 16%; opacity: 0.6; animation: nexorbSpin 20s linear infinite reverse; }

        /* Speaking = energetic */
        .nexorb--speaking .nexorb__core,
        .nexorb--speaking .nexorb__halo { animation-duration: 1.05s; }
        .nexorb--speaking .nexorb__ring--1 { animation-duration: 6s; }
        .nexorb--speaking .nexorb__ring--2 { animation-duration: 9s; }
        /* Listening = calm breathing */
        .nexorb--listening .nexorb__core,
        .nexorb--listening .nexorb__halo { animation-duration: 4.5s; }

        @keyframes nexorbPulse {
          0%, 100% { transform: scale(1);    opacity: 0.92; }
          50%      { transform: scale(1.13); opacity: 1; }
        }
        @keyframes nexorbSpin  { to { transform: rotate(360deg); } }
        @keyframes nexorbFloat {
          0%, 100% { transform: translateY(-12px); }
          50%      { transform: translateY(12px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexorb, .nexorb * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
