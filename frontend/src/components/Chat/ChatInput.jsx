import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, Mic, MicOff, Paperclip,
  Code2, Search, BookOpen, ChevronDown, X
} from 'lucide-react';

const MODES = [
  { id: 'chat',     label: 'Chat',     icon: Sparkles, desc: 'General conversation' },
  { id: 'code',     label: 'Code',     icon: Code2,    desc: 'Read codebase, debug, improve' },
  { id: 'research', label: 'Research', icon: Search,   desc: 'Deep dive with sources' },
  { id: 'plan',     label: 'Plan',     icon: BookOpen, desc: 'Structured planning mode' },
];

export default function ChatInput({ onSend, disabled, isListening, isSpeaking, onToggleListening, voiceEnabled }) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('chat');
  const [showModes, setShowModes] = useState(false);
  const textareaRef = useRef(null);
  const modeRef = useRef(null);

  // Auto-focus when not disabled
  useEffect(() => {
    if (!disabled && textareaRef.current) textareaRef.current.focus();
  }, [disabled]);

  // Close mode picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modeRef.current && !modeRef.current.contains(e.target)) setShowModes(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    const prefix = mode !== 'chat' ? `[${mode.toUpperCase()} MODE] ` : '';
    onSend(prefix + input.trim());
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Escape clears input
    if (e.key === 'Escape' && input) setInput('');
  };

  const currentMode = MODES.find(m => m.id === mode);
  const ModeIcon = currentMode?.icon || Sparkles;
  const charCount = input.length;

  return (
    <div className="border-t border-white/5 glass-strong">
      <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">

        {/* Input area */}
        <div className="flex items-end gap-2">

          {/* Mode selector */}
          <div className="relative self-end mb-0.5" ref={modeRef}>
            <button
              onClick={() => setShowModes(s => !s)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                mode !== 'chat'
                  ? 'bg-muse-500/15 text-muse-300 border border-muse-500/25'
                  : 'text-white/30 hover:text-white/55 hover:bg-white/5 border border-transparent'
              }`}
              title="Switch AI mode"
            >
              <ModeIcon size={12} />
              {mode !== 'chat' && <span className="hidden sm:inline">{currentMode?.label}</span>}
              <ChevronDown size={10} />
            </button>

            {showModes && (
              <div className="absolute bottom-full left-0 mb-2 w-52 glass-strong rounded-xl border border-white/10 shadow-nexora-lg z-50 overflow-hidden animate-scale-in">
                {MODES.map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setMode(m.id); setShowModes(false); textareaRef.current?.focus(); }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        mode === m.id ? 'bg-muse-500/10 text-muse-300' : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-[10px] text-white/35 mt-0.5">{m.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Textarea */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'chat'     ? 'Message Nex…' :
                mode === 'code'     ? 'Describe what to analyze or build…' :
                mode === 'research' ? 'What do you want to research?' :
                                     'What are you planning?'
              }
              rows={1}
              disabled={disabled}
              className="textarea-nexora resize-none min-h-[44px] max-h-[160px] leading-relaxed pr-12 transition-all"
              style={{ scrollbarWidth: 'none' }}
            />
            {/* Char count (only when >200) */}
            {charCount > 200 && (
              <span className="absolute right-3 bottom-3 text-[10px] text-white/20 font-mono">{charCount}</span>
            )}
            {/* Clear button */}
            {input && !disabled && (
              <button
                onClick={() => { setInput(''); textareaRef.current?.focus(); }}
                className="absolute right-3 top-3 text-white/20 hover:text-white/50 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Voice button */}
          {onToggleListening && (
            <button
              onClick={onToggleListening}
              className={`p-2.5 rounded-xl transition-all duration-200 self-end mb-0.5 ${
                isListening
                  ? 'bg-red-500/20 text-red-400 animate-glow-pulse'
                  : isSpeaking
                    ? 'bg-muse-500/15 text-muse-400 animate-pulse'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="btn-primary p-2.5 rounded-xl disabled:opacity-30 shrink-0 self-end mb-0.5"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/15">
            {disabled ? 'Nex is thinking…' : 'Enter to send · Shift+Enter for new line · Esc to clear'}
          </p>
          {mode !== 'chat' && (
            <button onClick={() => setMode('chat')} className="text-[10px] text-muse-400/60 hover:text-muse-400 transition-colors">
              Exit {currentMode?.label} mode ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
