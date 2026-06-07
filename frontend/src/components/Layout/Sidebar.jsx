import React, { useState, useEffect } from 'react';
import { MessageCircle, Brain, Sliders, Plus, History, Loader, Trash2 } from 'lucide-react';
import api from '../../services/api';

const NAV_ITEMS = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'personality', label: 'Personality', icon: Sliders },
];

export default function Sidebar({ activeView, onViewChange, onNewSession, onLoadSession, currentSessionId }) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await api.chat.getSessions();
      setSessions(data.sessions || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeView === 'chat') {
      fetchSessions();
    }
  }, [activeView, currentSessionId]);

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.chat.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
    } catch {}
  };

  return (
    <div className={`bg-deep-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300 ${
      collapsed ? 'w-[52px]' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-muse-500 to-muse-700 
                     flex items-center justify-center shrink-0 shadow-lg shadow-muse-500/20
                     hover:shadow-muse-500/30 transition-all duration-200"
        >
          <span className="text-xs font-bold text-white">M</span>
        </button>
        {!collapsed && (
          <span className="font-display font-semibold text-sm text-gradient">Muse</span>
        )}
      </div>

      {/* Navigation */}
      <div className="p-2 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
              activeView === item.id
                ? 'bg-muse-500/15 text-muse-300 shadow-sm shadow-muse-500/5'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}
      </div>

      {/* Chat Sessions */}
      {!collapsed && activeView === 'chat' && (
        <>
          <div className="px-4 py-2 flex items-center justify-between border-t border-white/5">
            <div className="flex items-center gap-2 text-white/40">
              <History size={12} />
              <span className="text-[10px] uppercase tracking-wider">History</span>
            </div>
            <button
              onClick={onNewSession}
              className="text-white/30 hover:text-muse-400 transition-colors p-1"
              title="New chat"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {loadingSessions ? (
              <div className="flex justify-center py-4">
                <Loader size={14} className="text-white/20 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-[11px] text-white/20 text-center py-4">
                No previous sessions
              </p>
            ) : (
              sessions.map(session => (
                <button
                  key={session._id}
                  onClick={() => onLoadSession(session._id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 group ${
                    currentSessionId === session._id
                      ? 'bg-deep-900/60 border border-muse-500/10'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <MessageCircle size={12} className="shrink-0 text-white/20" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50 truncate">
                      {session.preview || 'Empty session'}
                    </p>
                    <p className="text-[10px] text-white/20">
                      {session.messageCount} messages
                      {session.lastMessage && ` · ${new Date(session.lastMessage).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, session._id)}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
