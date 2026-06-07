import React, { useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.isError;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const renderContent = (text) => {
    // Simple markdown-like rendering
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      // Italic
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Code blocks
      line = line.replace(/`([^`]+)`/g, '<code class="bg-deep-800/50 text-muse-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

      return (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          <span dangerouslySetInnerHTML={{ __html: line }} />
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`flex items-start gap-3 animate-slide-up px-4 ${
      isUser ? 'flex-row-reverse' : ''
    }`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        shadow-lg ${isUser
          ? 'bg-gradient-to-br from-muse-400 to-muse-600 shadow-muse-500/20'
          : 'bg-gradient-to-br from-muse-500 to-muse-700 shadow-muse-500/20'
        }`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Message Bubble */}
      <div className={`group relative max-w-[80%] ${
        isUser ? 'message-bubble-user' : 'message-bubble-muse'
      } ${isError ? 'border-red-500/30 bg-red-900/20' : ''}`}>
        <div className={`text-sm leading-relaxed ${
          isUser ? 'text-white' : 'text-white/90'
        }`}>
          {renderContent(message.content)}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`absolute -bottom-6 ${isUser ? 'right-0' : 'left-0'} 
            opacity-0 group-hover:opacity-100 transition-opacity duration-200
            text-white/30 hover:text-white/60`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}
