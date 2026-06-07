import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

export default function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-white/5 bg-deep-950/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message Muse..."
              rows={1}
              disabled={disabled}
              className="input-muse resize-none pr-10 min-h-[44px] max-h-[150px] leading-relaxed"
              style={{ scrollbarWidth: 'none' }}
            />
            <Sparkles
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muse-400/40 pointer-events-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="btn-primary p-3 rounded-xl disabled:opacity-30 shrink-0"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="text-[10px] text-white/20 text-center mt-2">
          Muse uses local AI — responses may be slow on first load · Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
