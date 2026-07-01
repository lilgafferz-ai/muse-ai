import React, { useRef, useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { Sparkles, Zap, Brain, Code2, Search } from 'lucide-react';

const SUGGESTIONS = [
  "What should I focus on today?",
  "Help me plan my week",
  "Review my recent ideas",
  "What do you remember about my projects?",
];

function EmptyState({ onSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 animate-fade-in">
      {/* Logo mark */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-muse-600 via-indigo-600 to-pulse-500
                        flex-center shadow-2xl shadow-muse-500/30 animate-breathe">
          <Sparkles size={36} className="text-white" />
        </div>
        {/* Orbital dots */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pulse-400 opacity-70 animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-neural-400 opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <h2 className="text-2xl font-display font-bold text-white mb-2">
        Nex is here
      </h2>
      <p className="text-white/40 text-sm max-w-sm mb-8 leading-relaxed">
        Your AI partner that remembers everything, reasons deeply, and gets more useful over time.
      </p>

      {/* Capability badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[
          { icon: Brain, label: 'Long-term memory' },
          { icon: Code2, label: 'Code analysis' },
          { icon: Search, label: 'Deep research' },
          { icon: Zap, label: 'Instant answers' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-white/50 text-xs">
            <Icon size={11} className="text-muse-400" />
            {label}
          </div>
        ))}
      </div>

      {/* Suggestion pills */}
      <div className="space-y-2 w-full max-w-sm">
        <p className="text-[10px] text-white/25 uppercase tracking-wider mb-3">Try asking...</p>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/6
                       text-white/50 text-sm hover:bg-white/[0.06] hover:border-muse-500/20 hover:text-white/75
                       transition-all duration-200 group"
          >
            <span className="text-muse-500/60 group-hover:text-muse-400 mr-2 text-xs">→</span>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatContainer({
  messages,
  isTyping,
  onSendMessage,
  error,
  isListening,
  isSpeaking,
  onToggleListening,
  voiceEnabled,
}) {
  const bottomRef = useRef(null);
  const messagesRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, atBottom]);

  const handleScroll = () => {
    const el = messagesRef.current;
    if (el) {
      const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(diff < 80);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={messagesRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-2"
      >
        {messages.length === 0 && !isTyping ? (
          <EmptyState onSuggestion={onSendMessage} />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id || msg._id}
                message={msg}
                onRegenerate={msg.role === 'assistant' ? () => {
                  // Trigger regeneration — find the last user message before this
                  const idx = messages.indexOf(msg);
                  const userMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
                  if (userMsg) onSendMessage(userMsg.content);
                } : undefined}
              />
            ))}

            {isTyping && (
              <div className="px-4 animate-slide-up">
                <TypingIndicator />
              </div>
            )}

            {error && (
              <div className="px-4 text-center">
                <p className="text-red-400/70 text-xs bg-red-500/10 rounded-xl px-4 py-2.5 inline-block border border-red-500/15">
                  {error}
                </p>
              </div>
            )}
          </>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Scroll-to-bottom button */}
      {!atBottom && messages.length > 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setAtBottom(true); }}
            className="px-4 py-1.5 rounded-full glass-strong border border-white/10 text-white/50
                       text-xs hover:text-white/80 hover:border-muse-500/30 transition-all animate-slide-up"
          >
            ↓ Jump to bottom
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={onSendMessage}
        disabled={isTyping}
        isListening={isListening}
        isSpeaking={isSpeaking}
        onToggleListening={onToggleListening}
        voiceEnabled={voiceEnabled}
      />
    </div>
  );
}
