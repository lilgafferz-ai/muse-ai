import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { MessageCircle } from 'lucide-react';

export default function ChatContainer({
  messages,
  isTyping,
  onSendMessage,
  error
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muse-500 to-muse-700 
                          flex items-center justify-center mb-4 shadow-xl shadow-muse-500/20
                          animate-glow">
              <MessageCircle size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-display font-semibold text-gradient mb-2">
              Muse is listening
            </h2>
            <p className="text-white/40 text-sm max-w-sm">
              Send a message to start the conversation. Muse remembers everything.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id || msg._id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        {error && (
          <div className="px-4 text-center">
            <p className="text-red-400/70 text-xs bg-red-500/10 rounded-lg px-3 py-2 inline-block">
              {error}
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <ChatInput onSend={onSendMessage} disabled={isTyping} />
    </div>
  );
}
