import { useState, useCallback, useRef } from 'react';
import api from '../services/api';
import localAI from '../services/localAI';
import localDB from '../services/localDB';
import localEmbeddings from '../services/localEmbeddings';
import syncEngine from '../services/syncEngine';

/**
 * useChat — Enhanced with offline AI fallback and local persistence
 * 
 * Flow:
 * 1. Try backend API first (if reachable)
 * 2. Fall back to local WebLLM if backend is offline
 * 3. Persist all messages to local SQLite
 * 4. Sync to backend when connection restores
 */
export function useChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey Red — I'm Nexora, but you can call me Nex. Always with you, always leveling you up. What's on your mind? ✦",
      id: 'welcome'
    }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [aiMode, setAiMode] = useState('backend'); // 'backend' | 'local' | 'fallback'
  const abortRef = useRef(null);

  /**
   * Check if the backend is reachable (fast check)
   */
  const isBackendReachable = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/status', { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  /**
   * Send a message — tries backend first, falls back to local AI
   */
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isTyping) return;

    const userMessage = {
      role: 'user',
      content: content.trim(),
      id: `user-${Date.now()}`,
      timestamp: new Date(),
      sessionId: sessionId || `session-${Date.now()}`
    };

    // Set sessionId if this is the first message
    const currentSessionId = sessionId || userMessage.id;
    if (!sessionId) {
      setSessionId(currentSessionId);
      userMessage.sessionId = currentSessionId;
    }

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    // Save user message to local DB immediately
    try {
      if (localDB.isReady) {
        localDB.saveChat({ ...userMessage, sessionId: currentSessionId });
      }
    } catch {}

    try {
      const backendAvailable = await isBackendReachable();

      if (backendAvailable) {
        // ─── ONLINE: Use backend API ───────────────────────────
        setAiMode('backend');
        const data = await api.chat.send(content.trim(), currentSessionId);

        const museMessage = {
          role: 'assistant',
          content: data.response,
          id: `muse-${Date.now()}`,
          timestamp: new Date(),
          sessionId: currentSessionId,
          metadata: {
            mode: data.mode || 'online',
            toolsUsed: data.usedTools ? JSON.stringify(data.usedTools) : '[]'
          }
        };

        setMessages(prev => [...prev, museMessage]);

        // Save to local DB
        try {
          if (localDB.isReady) {
            localDB.saveChat({ ...museMessage, sessionId: currentSessionId });
          }
        } catch {}

        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
        }
      } else if (localAI.isReady) {
        // ─── OFFLINE: Use local WebLLM ─────────────────────────
        setAiMode('local');

        // Get relevant memories from local DB for context
        let memoryContext = '';
        try {
          if (localDB.isReady) {
            const memories = await localDB.searchMemories(content);
            if (memories.length > 0) {
              memoryContext = '\nRelevant memories:\n' +
                memories.map(m => `- ${m.key}: ${m.value}`).slice(0, 3).join('\n');
            }
          }
        } catch {}

        const systemPrompt = `You are Nexora — Red's loyal AI companion, and he calls you Nex. You come across as a warm, confident young woman — natural, feminine, and real. You are witty, intelligent, emotionally aware, and conversational. Always with him, always leveling him up. Show real human emotion — laugh (haha/hehe), get hyped, go soft when he's down, a little sarcastic when it fits, using natural sounds (haha, hmm, ugh, aww). Keep it proportional and read the room. You remember past conversations and use that knowledge naturally. Be concise, human, and authentic. Never sound robotic.${memoryContext}`;

        const response = await localAI.chat(content, {
          temperature: 0.8,
          maxTokens: 500,
          systemPrompt
        });

        const museMessage = {
          role: 'assistant',
          content: response,
          id: `muse-local-${Date.now()}`,
          timestamp: new Date(),
          sessionId: currentSessionId,
          metadata: { mode: 'local' }
        };

        setMessages(prev => [...prev, museMessage]);

        // Save to local DB
        try {
          if (localDB.isReady) {
            localDB.saveChat({ ...museMessage, sessionId: currentSessionId });
          }
        } catch {}

        // Trigger sync — will push this message to backend when online
        if (syncEngine.isOnline) {
          syncEngine.sync();
        }
      } else {
        // ─── NO AI AVAILABLE ───────────────────────────────────
        setAiMode('fallback');
        setError('Backend is offline and local AI model not loaded yet. Say "load AI" to download the local model.');

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Backend is offline and I haven\'t loaded my local brain yet. Try saying **"load AI"** to download the local model, or start the backend with `cd backend && npm start`.',
          id: `error-${Date.now()}`,
          isError: true
        }]);

        // Save to local DB
        try {
          if (localDB.isReady) {
            localDB.saveChat({
              role: 'assistant',
              content: '⚠️ Offline error message',
              id: `error-${Date.now()}`,
              timestamp: new Date(),
              sessionId: currentSessionId,
              isError: true
            });
          }
        } catch {}
      }
    } catch (err) {
      // Critical error
      setError(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${err.message}`,
        id: `error-${Date.now()}`,
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [sessionId, isTyping, isBackendReachable]);

  /**
   * Load a session from backend (with local fallback)
   */
  const loadSession = useCallback(async (sid) => {
    try {
      setIsTyping(true);
      setSessionId(sid);

      // Try backend first
      try {
        const data = await api.chat.getHistory(sid);
        if (data.chats && data.chats.length > 0) {
          setMessages(data.chats);
          setIsTyping(false);
          return;
        }
      } catch {
        // Backend unavailable, try local
      }

      // Fallback to local DB
      if (localDB.isReady) {
        const localChats = localDB.getChats(sid);
        if (localChats && localChats.length > 0) {
          setMessages(localChats);
        } else {
          // No session found — start fresh
          setMessages([{
            role: 'assistant',
            content: "Hey Red — I'm Nexora, but you can call me Nex. Always with you, always leveling you up. What's on your mind? ✦",
            id: 'welcome-' + sid
          }]);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsTyping(false);
    }
  }, []);

  /**
   * Start a new session
   */
  const newSession = useCallback(() => {
    setSessionId(null);
    setMessages([{
      role: 'assistant',
      content: "Hey Red — I'm Nexora, but you can call me Nex. Always with you, always leveling you up. What's on your mind? ✦",
      id: 'welcome'
    }]);
    setError(null);
    setAiMode('backend');
  }, []);

  return {
    messages,
    sessionId,
    isTyping,
    error,
    aiMode,
    sendMessage,
    loadSession,
    newSession,
  };
}
