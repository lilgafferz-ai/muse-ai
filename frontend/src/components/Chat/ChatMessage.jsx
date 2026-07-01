import React, { useState } from 'react';
import {
  Bot, User, Copy, Check, RotateCcw, Bookmark,
  Brain, Share, MoreHorizontal, ThumbsUp, AlertTriangle,
  ChevronDown, ChevronRight, Sparkles, Clock
} from 'lucide-react';
import MarkdownRenderer from '../UI/MarkdownRenderer';
import { useNexora } from '../../context/NexoraContext';

function ReasoningTrace({ trace }) {
  const [open, setOpen] = useState(false);
  if (!trace) return null;

  return (
    <div className="mt-2 border border-muse-500/15 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muse-400/70 hover:text-muse-400 hover:bg-muse-500/5 transition-colors"
      >
        <Brain size={11} />
        <span>Reasoning trace</span>
        {open ? <ChevronDown size={11} className="ml-auto" /> : <ChevronRight size={11} className="ml-auto" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-muse-500/10">
          {Object.entries(trace).map(([key, value]) => value ? (
            <div key={key} className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-white/25 font-semibold mb-1">{key}</p>
              <p className="text-white/45 text-[11px] font-mono leading-relaxed whitespace-pre-wrap">{value}</p>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

function MessageActions({ message, onRegenerate, onCopy, onBookmark, onSaveMemory, copied, bookmarked }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Copy */}
      <button
        onClick={onCopy}
        className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
        title="Copy"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      </button>

      {/* Bookmark */}
      <button
        onClick={onBookmark}
        className={`p-1.5 rounded-lg transition-all ${bookmarked ? 'text-amber-400 hover:bg-amber-500/10' : 'text-white/25 hover:text-white/60 hover:bg-white/5'}`}
        title="Bookmark"
      >
        <Bookmark size={12} />
      </button>

      {/* Regenerate (AI messages only) */}
      {message.role === 'assistant' && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
          title="Regenerate"
        >
          <RotateCcw size={12} />
        </button>
      )}

      {/* More */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <MoreHorizontal size={12} />
        </button>
        {menuOpen && (
          <div className="absolute bottom-full right-0 mb-1 w-40 glass-strong rounded-xl border border-white/10 shadow-nexora-lg z-20 overflow-hidden animate-scale-in">
            <button
              onClick={() => { onSaveMemory?.(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Brain size={11} /> Save to Memory
            </button>
            <button
              onClick={() => { navigator.share?.({ text: message.content }); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Share size={11} /> Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatMessage({ message, onRegenerate }) {
  const { devMode } = useNexora();
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const isUser = message.role === 'user';
  const isError = message.isError;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = message.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMemory = async () => {
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.content, userId: 'default', type: 'manual' })
      });
    } catch {}
  };

  // Timestamp display
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`flex items-start gap-3 px-4 py-1.5 group animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>

      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex-center text-xs font-bold shrink-0 mt-1 shadow-lg ${
        isUser
          ? 'bg-gradient-to-br from-muse-400 to-muse-600 shadow-muse-500/20'
          : 'bg-gradient-to-br from-deep-700 to-deep-900 border border-muse-500/20'
      }`}>
        {isUser ? <User size={13} /> : <Sparkles size={13} className="text-muse-300" />}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Sender + timestamp */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-white/25 font-medium">
            {isUser ? 'You' : 'Nex'}
          </span>
          {timestamp && (
            <span className="text-[9px] text-white/15 flex items-center gap-0.5">
              <Clock size={8} />{timestamp}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div className={`relative ${isError ? 'opacity-80' : ''}`}>
          {isUser ? (
            <div className="message-bubble-user">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <div className={`message-bubble-nexora ${isError ? 'border-red-500/30 bg-red-900/10' : ''}`}>
              {isError && (
                <div className="flex items-center gap-2 mb-2 text-red-400 text-xs">
                  <AlertTriangle size={13} /> Error response
                </div>
              )}
              <MarkdownRenderer content={message.content} />

              {/* Reasoning trace (dev mode only) */}
              {devMode && message.metadata?.reasoningTrace && (
                <ReasoningTrace trace={message.metadata.reasoningTrace} />
              )}

              {/* Tool badges */}
              {message.metadata?.toolsUsed && (() => {
                try {
                  const tools = JSON.parse(message.metadata.toolsUsed);
                  if (tools.length > 0) {
                    return (
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1">
                        {tools.map((t, i) => (
                          <span key={i} className={`badge text-[10px] ${t.success ? '' : 'badge-red'}`}>
                            {t.tool} {t.success ? '✓' : '✗'}
                          </span>
                        ))}
                      </div>
                    );
                  }
                } catch {}
                return null;
              })()}

              {/* Memory sources badge */}
              {message.memoriesFound > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muse-400/60">
                  <Brain size={9} />
                  <span>{message.memoriesFound} memor{message.memoriesFound > 1 ? 'ies' : 'y'} referenced</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <MessageActions
          message={message}
          onCopy={handleCopy}
          onBookmark={() => setBookmarked(b => !b)}
          onRegenerate={onRegenerate}
          onSaveMemory={handleSaveMemory}
          copied={copied}
          bookmarked={bookmarked}
        />
      </div>
    </div>
  );
}
