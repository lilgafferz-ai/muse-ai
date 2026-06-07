import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in px-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muse-500 to-muse-700 
                      flex items-center justify-center text-xs font-bold shrink-0
                      shadow-lg shadow-muse-500/20">
        M
      </div>
      <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="typing-animation">
          <span className="bg-muse-400/60"></span>
          <span className="bg-muse-400/60"></span>
          <span className="bg-muse-400/60"></span>
        </div>
      </div>
    </div>
  );
}
