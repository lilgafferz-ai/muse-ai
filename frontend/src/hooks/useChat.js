import { useState, useCallback } from 'react';
import api from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey Red. I'm Muse. Your personal AI companion with a personality. What's on your mind? 🧠",
      id: 'welcome'
    }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isTyping) return;

    const userMessage = {
      role: 'user',
      content: content.trim(),
      id: `user-${Date.now()}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    try {
      const data = await api.chat.send(content.trim(), sessionId);

      const museMessage = {
        role: 'assistant',
        content: data.response,
        id: `muse-${Date.now()}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, museMessage]);

      if (!sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (err) {
      setError(err.message);

      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${err.message}`,
        id: `error-${Date.now()}`,
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [sessionId, isTyping]);

  const loadSession = useCallback(async (sid) => {
    try {
      setIsTyping(true);
      const data = await api.chat.getHistory(sid);
      setSessionId(sid);

      if (data.chats && data.chats.length > 0) {
        setMessages(data.chats);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTyping(false);
    }
  }, []);

  const newSession = useCallback(() => {
    setSessionId(null);
    setMessages([{
      role: 'assistant',
      content: "Hey Red. I'm Muse. Your personal AI companion with a personality. What's on your mind? 🧠",
      id: 'welcome'
    }]);
    setError(null);
  }, []);

  return {
    messages,
    sessionId,
    isTyping,
    error,
    sendMessage,
    loadSession,
    newSession,
  };
}
