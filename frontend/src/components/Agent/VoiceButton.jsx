import React, { useState } from 'react';
import { Mic, MicOff, Volume2, Loader, Sparkles } from 'lucide-react';

export default function VoiceButton({
  isListening,
  isSpeaking,
  isSupported,
  voiceEnabled,
  onToggleListening,
  onToggleVoice
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (!isSupported) return null;

  return (
    <div className="relative">
      {/* Main voice button */}
      <button
        onClick={onToggleListening}
        disabled={!voiceEnabled}
        className={`relative p-2.5 rounded-xl transition-all duration-200 ${
          isListening
            ? 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20 animate-glow'
            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
        } ${!voiceEnabled ? 'opacity-30' : ''}`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <>
            <Mic size={16} className="animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          </>
        ) : (
          <Mic size={16} />
        )}
      </button>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute -top-1 -right-1">
          <Volume2 size={10} className="text-muse-400 animate-pulse" />
        </div>
      )}

      {/* Settings gear */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-deep-800 border border-white/10
                   flex items-center justify-center hover:bg-deep-700 transition-colors"
        title="Voice settings"
      >
        <Sparkles size={6} className="text-white/40" />
      </button>

      {/* Voice settings menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-44 glass-panel rounded-lg p-2 z-50">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-white/60">Voice output</span>
              <button
                onClick={() => {
                  onToggleVoice();
                }}
                className={`w-8 h-4 rounded-full transition-colors duration-200 ${
                  voiceEnabled ? 'bg-muse-500' : 'bg-white/10'
                } relative`}
              >
                <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${
                  voiceEnabled ? 'left-4' : 'left-0.5'
                }`} />
              </button>
            </div>
            <p className="px-2 text-[9px] text-white/20">
              {isListening ? 'Listening... Speak now' : 'Click mic to start'}
            </p>
            {isListening && (
              <div className="flex items-center gap-1 px-2 py-1 mt-1">
                <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                <span className="text-[10px] text-white/30 ml-1">Recording</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
