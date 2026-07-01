import React, { useState, useEffect } from 'react';
import {
  Home, MessageCircle, FolderOpen, Calendar, Lightbulb,
  Network, Terminal, Settings, Brain, Plus, History,
  Loader, Trash2, ChevronLeft, ChevronRight, Zap,
  MoreHorizontal, Star, MessageSquare
} from 'lucide-react';
import api from '../../services/api';
import { useNexora } from '../../context/NexoraContext';

const NAV_ITEMS = [
  { id: 'home',      label: 'Home',         icon: Home,          shortcut: 'G H' },
  { id: 'chat',      label: 'Chat',         icon: MessageCircle, shortcut: 'G C' },
  { id: 'projects',  label: 'Projects',     icon: FolderOpen,    shortcut: 'G P' },
  { id: 'planner',   label: 'Planner',      icon: Calendar,      shortcut: 'G L' },
  { id: 'ideas',     label: 'Idea Vault',   icon: Lightbulb,     shortcut: 'G I' },
  { id: 'knowledge', label: 'Knowledge',    icon: Network,       shortcut: 'G K' },
];

const BOTTOM_ITEMS = [
  { id: 'devmode',   label: 'Dev Mode',     icon: Terminal,      shortcut: 'G D' },
  { id: 'memory',    label: 'Memory',       icon: Brain,         shortcut: '' },
  { id: 'settings',  label: 'Settings',     icon: Settings,      shortcut: 'G S' },
];

export default function Sidebar({ activeView, onViewChange, onNewSession, onLoadSession, currentSessionId }) {
  const { sidebarCollapsed, setSidebarCollapsed, openCommandPalette } = useNexora();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const collapsed = sidebarCollapsed;

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await api.chat.getSessions();
      setSessions(data.sessions || []);
    } catch {}
    setLoadingSessions(false);
  };

  useEffect(() => {
    if (activeView === 'chat' && !collapsed) fetchSessions();
  }, [activeView, currentSessionId, collapsed]);

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.chat.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
    } catch {}
  };

  return (
    <div className={`sidebar-bg h-full flex flex-col transition-all duration-300 ${collapsed ? 'w-14' : 'w-64'}`}>

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className="w-8 h-8 rounded-xl flex-center shrink-0 transition-all duration-200 hover:scale-105 group relative"
          style={{ background: 'linear-gradient(135deg, #6d28d9, #4f46e5, #db2777)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-sm font-bold text-white font-display">N</span>
          {/* Subtle glow on hover */}
          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ boxShadow: '0 0 16px rgba(139,92,246,0.5)' }} />
        </button>

        {!collapsed && (
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-display font-bold text-sm tracking-[0.22em] text-gradient">
              NEXORA
            </span>
            <span className="text-[9px] text-white/25 tracking-wide mt-0.5">AI Operating System</span>
          </div>
        )}
      </div>

      {/* ── Cmd+K search ─────────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200
                       bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/10
                       hover:bg-white/[0.05]"
          >
            <Zap size={13} />
            <span className="flex-1 text-left text-xs">Quick action...</span>
            <kbd className="text-[10px] font-mono bg-white/8 px-1.5 py-0.5 rounded-md text-white/20">⌘K</kbd>
          </button>
        </div>
      )}

      {/* ── New chat ─────────────────────────────────────── */}
      <div className={`px-3 py-2 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={() => { onNewSession(); onViewChange('chat'); }}
          className={`flex items-center gap-2 rounded-xl transition-all duration-200 text-sm font-medium
                       hover:bg-muse-500/10 hover:text-muse-300 text-white/40 group ${
                       collapsed ? 'p-2 justify-center w-9 h-9' : 'px-3 py-2 w-full'}`}
          title={collapsed ? 'New Chat' : undefined}
        >
          <Plus size={16} className="shrink-0" />
          {!collapsed && <span>New Chat</span>}
          {!collapsed && <span className="ml-auto text-[9px] font-mono text-white/20">N</span>}
        </button>
      </div>

      {/* ── Primary Nav ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 py-2.5' : ''} relative group`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-[9px] font-mono text-white/15 group-hover:text-white/30 transition-colors hidden lg:block">
                      {item.shortcut}
                    </span>
                  )}
                </>
              )}
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-muse-400 rounded-full" />
              )}
            </button>
          );
        })}

        {/* ── Chat History ───────────────────────────────── */}
        {!collapsed && activeView === 'chat' && (
          <div className="pt-2">
            <button
              onClick={() => { setShowHistory(h => !h); if (!showHistory) fetchSessions(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-white/25 hover:text-white/45 transition-colors text-xs"
            >
              <History size={11} />
              <span className="flex-1 text-left uppercase tracking-wider text-[10px] font-semibold">History</span>
              {showHistory ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
            </button>

            {showHistory && (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {loadingSessions ? (
                  <div className="flex justify-center py-3">
                    <Loader size={13} className="text-white/20 animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-[11px] text-white/20 text-center py-3">No sessions yet</p>
                ) : (
                  sessions.map(session => (
                    <button
                      key={session._id}
                      onClick={() => onLoadSession(session._id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 group ${
                        currentSessionId === session._id
                          ? 'bg-muse-500/10 text-white/70'
                          : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                      }`}
                    >
                      <MessageSquare size={11} className="shrink-0 text-white/20" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] truncate">{session.preview || 'Empty session'}</p>
                        <p className="text-[9px] text-white/15">
                          {session.messageCount} msgs
                          {session.lastMessage && ` · ${new Date(session.lastMessage).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                      <button
                        onClick={e => handleDeleteSession(e, session._id)}
                        className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-red-400 transition-all p-0.5"
                      >
                        <Trash2 size={10} />
                      </button>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── Bottom Nav ───────────────────────────────────── */}
      <div className="px-2 py-2 border-t border-white/5 space-y-0.5">
        {BOTTOM_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 py-2.5' : ''} relative`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-muse-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Collapse toggle (expanded) ────────────────────── */}
      {!collapsed && (
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="mx-3 mb-2 flex items-center justify-center gap-2 p-2 rounded-xl text-white/15 hover:text-white/35 hover:bg-white/[0.04] transition-all text-xs"
        >
          <ChevronLeft size={12} /> Collapse
        </button>
      )}
    </div>
  );
}
