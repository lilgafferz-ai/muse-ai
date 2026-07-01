import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cpu, Wifi, WifiOff, Database, Download, Loader } from 'lucide-react';

// Context
import { NexoraProvider, useNexora } from './context/NexoraContext';

// Layout
import Sidebar from './components/Layout/Sidebar';

// Views
import HomeView        from './views/HomeView';
import ProjectsView    from './views/ProjectsView';
import PlannerView     from './views/PlannerView';
import IdeaVaultView   from './views/IdeaVaultView';
import KnowledgeView   from './views/KnowledgeView';
import SettingsView    from './views/SettingsView';
import DevModeView     from './views/DevModeView';

// Chat components
import ChatContainer   from './components/Chat/ChatContainer';
import MemoryViewer    from './components/Memory/MemoryViewer';

// UI components
import CommandPalette  from './components/UI/CommandPalette';
import { ToastProvider, useToast } from './components/UI/NotificationToast';

// Agent panel
import AgentPanel      from './components/Agent/AgentPanel';
import StatusIndicator from './components/Agent/StatusIndicator';
import VoiceButton     from './components/Agent/VoiceButton';

// Hooks & services
import { useChat }             from './hooks/useChat';
import { useVoice }            from './hooks/useVoice';
import { useWakeWord }         from './hooks/useWakeWord';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import api                     from './services/api';
import localAI                 from './services/localAI';
import localDB                 from './services/localDB';
import localEmbeddings         from './services/localEmbeddings';
import syncEngine              from './services/syncEngine';

// ─── Inner App (has access to NexoraContext) ──────────────────────────────────

function AppInner() {
  const {
    commandPaletteOpen, openCommandPalette, closeCommandPalette,
    devMode, sidebarCollapsed
  } = useNexora();

  const [activeView, setActiveView] = useState('home');
  const [isOnline, setIsOnline] = useState(false);
  const [usedTools, setUsedTools] = useState([]);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [callMode, setCallMode] = useState(false);
  const [nameListening, setNameListening] = useState(false);
  const voiceInitialized = useRef(false);

  // Local offline service states
  const [localStatus, setLocalStatus] = useState({
    dbReady: false, aiReady: false, aiLoading: false, aiProgress: 0,
    embeddingsReady: false, embeddingsLoading: false, syncOnline: false,
  });
  const [showLocalControls, setShowLocalControls] = useState(false);
  const [initError, setInitError] = useState(null);

  const { messages, sessionId, isTyping, error, aiMode, sendMessage, loadSession, newSession } = useChat();
  const voice = useVoice();
  const wakeWord = useWakeWord();

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────────
  useKeyboardShortcuts({
    onNavigate: setActiveView,
    onOpenCommandPalette: openCommandPalette,
    onNewChat: () => { newSession(); setActiveView('chat'); },
  });

  // ─── Init Local Services ────────────────────────────────────────────────────
  useEffect(() => {
    const initLocalServices = async () => {
      try {
        const dbReady = await localDB.init();
        setLocalStatus(prev => ({ ...prev, dbReady }));
        await syncEngine.init();
        syncEngine.setOnline(isOnline);
        setLocalStatus(prev => ({ ...prev, embeddingsLoading: true }));
        localEmbeddings.init().then((ready) => {
          setLocalStatus(prev => ({ ...prev, embeddingsReady: ready, embeddingsLoading: false }));
        });
        setInterval(() => {
          setLocalStatus(prev => ({
            ...prev,
            aiReady: localAI.isReady, aiLoading: localAI.isLoading,
            aiProgress: localAI.loadProgress, embeddingsReady: localEmbeddings.isReady,
            syncOnline: syncEngine.isOnline,
          }));
        }, 5000);
      } catch (err) {
        console.warn('[App] Local service init error:', err.message);
        setInitError(err.message);
      }
    };
    initLocalServices();
  }, []);

  // ─── Connectivity ───────────────────────────────────────────────────────────
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await api.status();
        const online = status.connectivity?.isOnline || false;
        setIsOnline(online);
        syncEngine.setOnline(online);
        if (online) syncEngine.startAutoSync(); else syncEngine.stopAutoSync();
      } catch {
        setIsOnline(false);
        syncEngine.setOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // ─── Voice setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!voiceInitialized.current && voice.isSupported) {
      voiceInitialized.current = true;
      voice.setOnCommand((command) => { sendMessageRef.current(command); });
    }
  }, [voice.isSupported]);

  useEffect(() => {
    if (wakeWord.isReady) {
      wakeWord.setOnWake((label) => {
        if (!voice.isListening) voice.startListening({ hotwordMode: false });
        voice.speak('Yes?');
      });
    }
  }, [wakeWord.isReady]);

  // ─── TTS on AI responses ────────────────────────────────────────────────────
  const prevMsgCountRef = useRef(0);
  const voiceEnabledRef = useRef(false);
  voiceEnabledRef.current = voice.voiceEnabled;
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant' && voiceEnabledRef.current && !lastMsg.isError) {
        voice.speak(lastMsg.content.slice(0, 400));
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length]);

  // ─── Voice call mode ────────────────────────────────────────────────────────
  const handleSend = useCallback(async (message) => {
    setShowAgentPanel(true);
    await sendMessage(message);
  }, [sendMessage]);

  const startCall = useCallback(() => {
    if (!voice.isSupported) return;
    setCallMode(true);
    if (!voice.voiceEnabled) voice.toggleVoice();
    voice.startListening({ hotwordMode: false });
  }, [voice]);

  const endCall = useCallback(() => {
    setCallMode(false);
    voice.stopListening();
    voice.stopSpeaking();
  }, [voice]);

  // Mute mic while speaking
  useEffect(() => {
    if (!callMode) return;
    if (voice.isSpeaking) {
      voice.stopListening();
    } else {
      const t = setTimeout(() => {
        if (!voice.isSpeaking) voice.startListening({ hotwordMode: false });
      }, 350);
      return () => clearTimeout(t);
    }
  }, [voice.isSpeaking, callMode]);

  // ─── Tool usage tracking ────────────────────────────────────────────────────
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg?.metadata?.toolsUsed) {
      try { setUsedTools(JSON.parse(lastMsg.metadata.toolsUsed)); } catch {}
    }
  }, [messages]);

  const handleLoadLocalAI = async () => {
    setLocalStatus(prev => ({ ...prev, aiLoading: true, aiProgress: 0 }));
    setInitError(null);
    try {
      await localAI.init();
      setLocalStatus(prev => ({ ...prev, aiLoading: false, aiReady: localAI.isReady, aiProgress: 100 }));
      if (localAI.isReady) voice.speak('Local brain loaded and ready.');
    } catch (err) {
      setInitError(err.message);
      setLocalStatus(prev => ({ ...prev, aiLoading: false }));
    }
  };

  // ─── Command palette navigation ──────────────────────────────────────────────
  const handlePaletteNavigate = useCallback((id) => {
    if (id === '__new_chat') { newSession(); setActiveView('chat'); }
    else if (id === '__new_project') setActiveView('projects');
    else if (id === '__idea') setActiveView('ideas');
    else setActiveView(id);
    closeCommandPalette();
  }, [closeCommandPalette, newSession]);

  const collapsedSidebar = sidebarCollapsed;

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'rgb(8, 5, 17)' }}>

      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div className="sidebar-overlay lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={closeCommandPalette}
        onNavigate={handlePaletteNavigate}
      />

      {/* ── Sidebar ────────────────────────────────────────── */}
      <div className={`${showSidebar ? 'sidebar-mobile' : 'hidden'} lg:block lg:relative z-50`}>
        <Sidebar
          activeView={activeView}
          onViewChange={(view) => { setActiveView(view); setShowSidebar(false); }}
          onNewSession={() => { newSession(); setUsedTools([]); setShowSidebar(false); setActiveView('chat'); }}
          onLoadSession={(sid) => { loadSession(sid); setShowSidebar(false); setActiveView('chat'); }}
          currentSessionId={sessionId}
        />
      </div>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 glass-strong flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden p-2 rounded-xl text-white/35 hover:text-white/65 hover:bg-white/5 transition-all"
              aria-label="Toggle menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <StatusIndicator
              isOnline={isOnline}
              isAgent={usedTools.length > 0}
              toolsUsed={usedTools.filter(t => t.success).length}
            />
          </div>

          {/* Center: view title */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-white/20 text-xs font-medium capitalize">{activeView === 'devmode' ? 'Dev Mode' : activeView}</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Local status badges */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-white/20 font-mono mr-1">
              <Database size={9} className={localStatus.dbReady ? 'text-green-400/60' : 'text-white/15'} />
              <span>{localStatus.dbReady ? 'DB' : 'no DB'}</span>
              {(localStatus.aiReady || localStatus.aiLoading) && (
                <>
                  <span className="text-white/10">·</span>
                  <Cpu size={9} className={localStatus.aiReady ? 'text-muse-400/60' : 'text-amber-400/60'} />
                  <span>{localStatus.aiReady ? 'Local AI' : `${localStatus.aiProgress}%`}</span>
                </>
              )}
            </div>

            {/* Load local AI */}
            {!localStatus.aiReady && !localStatus.aiLoading && (
              <button
                onClick={handleLoadLocalAI}
                className="hidden sm:flex text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/25 hover:text-white/50 border border-transparent hover:border-white/10 transition-all"
                title="Load offline AI"
              >
                <Download size={11} />
              </button>
            )}
            {localStatus.aiLoading && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-amber-400/60">
                <Loader size={10} className="animate-spin" />
                <span>{localStatus.aiProgress}%</span>
              </div>
            )}

            {/* Voice */}
            <VoiceButton
              isListening={voice.isListening}
              isSpeaking={voice.isSpeaking}
              isSupported={voice.isSupported}
              voiceEnabled={voice.voiceEnabled}
              onToggleListening={() => {
                if (voice.isListening) voice.stopListening();
                else voice.startListening({ hotwordMode: false });
              }}
              onToggleVoice={voice.toggleVoice}
            />

            {/* Agent log */}
            {usedTools.length > 0 && (
              <button
                onClick={() => setShowAgentPanel(!showAgentPanel)}
                className={`text-[10px] px-2 py-1 rounded-lg transition-all duration-200 ${
                  showAgentPanel
                    ? 'bg-muse-500/15 text-muse-400 border border-muse-500/20'
                    : 'text-white/25 hover:text-white/50 border border-transparent hover:border-white/10'
                }`}
              >
                Agent
              </button>
            )}
          </div>
        </div>

        {/* ── View Content ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Decorative gradients */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-60 -right-60 w-[500px] h-[500px] bg-muse-600/4 rounded-full blur-3xl" />
            <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-blue-600/4 rounded-full blur-3xl" />
          </div>

          {activeView === 'home'      && <HomeView onNavigate={setActiveView} onNewChat={() => { newSession(); setActiveView('chat'); }} />}
          {activeView === 'chat'      && (
            <ChatContainer
              messages={messages}
              isTyping={isTyping}
              onSendMessage={handleSend}
              error={error}
              isListening={voice.isListening}
              isSpeaking={voice.isSpeaking}
              onToggleListening={() => {
                if (voice.isListening) voice.stopListening();
                else voice.startListening({ hotwordMode: false });
              }}
              voiceEnabled={voice.voiceEnabled}
            />
          )}
          {activeView === 'projects'  && <ProjectsView />}
          {activeView === 'planner'   && <PlannerView />}
          {activeView === 'ideas'     && <IdeaVaultView />}
          {activeView === 'knowledge' && <KnowledgeView />}
          {activeView === 'memory'    && <div className="flex-1 overflow-hidden"><MemoryViewer /></div>}
          {activeView === 'settings'  && <SettingsView />}
          {activeView === 'devmode'   && <DevModeView />}
          {activeView === 'personality' && <div className="flex-1 overflow-hidden"><MemoryViewer /></div>}
        </div>

        {/* ── Status Bar ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-1 text-[9px] text-white/10 font-mono border-t border-white/[0.03] flex-shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-gradient font-semibold">NEXORA</span>
            <span className="text-white/5">·</span>
            <span>Nex v1.0</span>
            <span className="text-white/5">·</span>
            <span className={aiMode === 'local' ? 'text-muse-400/50' : 'text-white/10'}>
              {aiMode === 'local' ? 'Offline' : aiMode === 'fallback' ? 'No AI' : 'Online'}
            </span>
            {localStatus.dbReady && (
              <>
                <span className="text-white/5">·</span>
                <Database size={7} className="text-green-400/30" />
                <span className="text-green-400/30">Local</span>
              </>
            )}
            {devMode && (
              <>
                <span className="text-white/5">·</span>
                <span className="text-amber-400/40">DEV</span>
              </>
            )}
          </div>
          <div className="text-white/5">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
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
    </div>
  );
}

// ─── Root App wrapped in providers ───────────────────────────────────────────

export default function App() {
  return (
    <NexoraProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </NexoraProvider>
  );
}
