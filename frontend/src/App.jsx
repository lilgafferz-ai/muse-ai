import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Layout/Sidebar';
import ChatContainer from './components/Chat/ChatContainer';
import MemoryViewer from './components/Memory/MemoryViewer';
import PersonalitySettings from './components/Settings/PersonalitySettings';
import AgentPanel from './components/Agent/AgentPanel';
import StatusIndicator from './components/Agent/StatusIndicator';
import VoiceButton from './components/Agent/VoiceButton';
import { useChat } from './hooks/useChat';
import { useVoice } from './hooks/useVoice';
import api from './services/api';

export default function App() {
  const [activeView, setActiveView] = useState('chat');
  const [isOnline, setIsOnline] = useState(false);
  const [usedTools, setUsedTools] = useState([]);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const voiceInitialized = useRef(false);
  
  const {
    messages,
    sessionId,
    isTyping,
    error,
    sendMessage,
    loadSession,
    newSession,
  } = useChat();

  const voice = useVoice();

  // Check connectivity on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await api.status();
        setIsOnline(status.connectivity?.isOnline || false);
      } catch {}
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ref to hold latest sendMessage without causing re-renders
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // Set up voice command handler
  useEffect(() => {
    if (!voiceInitialized.current && voice.isSupported) {
      voiceInitialized.current = true;
      voice.setOnCommand((command) => {
        sendMessageRef.current(command);
      });
    }
  }, [voice.isSupported]);

  // Enhanced send that tracks tool usage
  const handleSend = useCallback(async (message) => {
    setShowAgentPanel(true);
    await sendMessage(message);
  }, [sendMessage]);

  // Speak Muse's response via TTS when new assistant messages appear
  const prevMsgCountRef = useRef(0);
  const voiceEnabledRef = useRef(false);
  voiceEnabledRef.current = voice.voiceEnabled;
  
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant' && voiceEnabledRef.current && !lastMsg.isError) {
        voice.speak(lastMsg.content.slice(0, 200));
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  // Track tool usage from messages metadata
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg?.metadata?.toolsUsed) {
      try {
        const tools = JSON.parse(lastMsg.metadata.toolsUsed);
        setUsedTools(tools);
      } catch {}
    }
  }, [messages]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-deep-950">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onNewSession={() => { newSession(); setUsedTools([]); }}
        onLoadSession={loadSession}
        currentSessionId={sessionId}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar with status */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <StatusIndicator 
            isOnline={isOnline}
            isAgent={usedTools.length > 0}
            toolsUsed={usedTools.filter(t => t.success).length}
          />
          <div className="flex items-center gap-1">
            <VoiceButton
              isListening={voice.isListening}
              isSpeaking={voice.isSpeaking}
              isSupported={voice.isSupported}
              voiceEnabled={voice.voiceEnabled}
              onToggleListening={() => {
                if (voice.isListening) {
                  voice.stopListening();
                } else {
                  voice.startListening({ hotwordMode: false });
                }
              }}
              onToggleVoice={voice.toggleVoice}
            />
            <button
              onClick={() => setShowAgentPanel(!showAgentPanel)}
              className={`text-[10px] px-2 py-1 rounded-lg transition-all duration-200 ${
                showAgentPanel
                  ? 'bg-muse-500/15 text-muse-400 border border-muse-500/20'
                  : 'text-white/30 hover:text-white/60 border border-transparent'
              }`}
            >
              Agent Log
            </button>
          </div>
        </div>

        {/* Decorative background gradient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-muse-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        {activeView === 'chat' && (
          <ChatContainer
            messages={messages}
            isTyping={isTyping}
            onSendMessage={handleSend}
            error={error}
          />
        )}

        {activeView === 'memory' && (
          <div className="flex-1 overflow-hidden">
            <MemoryViewer />
          </div>
        )}

        {activeView === 'personality' && (
          <div className="flex-1 overflow-hidden">
            <PersonalitySettings />
          </div>
        )}
      </main>

      {/* Agent Panel (floating) */}
      {showAgentPanel && (
        <AgentPanel
          isOnline={isOnline}
          isAgentMode={usedTools.length > 0}
          usedTools={usedTools}
          onClose={() => setShowAgentPanel(false)}
        />
      )}

      {/* Status bar */}
      <div className="fixed bottom-0 right-0 px-3 py-1 text-[10px] text-white/10 font-mono z-50">
        Muse Agent v1.0
      </div>
    </div>
  );
}
