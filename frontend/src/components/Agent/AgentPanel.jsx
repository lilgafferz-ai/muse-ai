import React from 'react';
import { Bot, Wifi, WifiOff, Cpu, X } from 'lucide-react';
import StatusIndicator from './StatusIndicator';
import ToolCall from './ToolCall';

export default function AgentPanel({ isOnline, isAgentMode, usedTools, onClose }) {
  if (usedTools.length === 0 && !isAgentMode) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 w-72 animate-slide-up">
      <div className="glass-panel rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded flex items-center justify-center ${
              isOnline ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              {isOnline ? <Wifi size={10} className="text-green-400" /> : <WifiOff size={10} className="text-yellow-400" />}
            </div>
            <span className="text-xs font-medium text-white/70">Nexora Agent</span>
            {isOnline ? (
              <span className="text-[9px] text-green-400/60 font-mono">ONLINE</span>
            ) : (
              <span className="text-[9px] text-yellow-400/60 font-mono">OFFLINE</span>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/20 hover:text-white/60 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tool calls */}
        <div className="p-2 space-y-1.5 max-h-60 overflow-y-auto">
          {usedTools.length === 0 && isAgentMode && (
            <div className="flex items-center gap-2 px-2 py-3 text-center">
              <Cpu size={14} className="text-muse-400 animate-pulse" />
              <span className="text-[11px] text-white/40">Agent ready — ask me to do something</span>
            </div>
          )}
          {usedTools.map((tool, i) => (
            <ToolCall key={i} tool={tool} />
          ))}
        </div>

        {/* Mode info */}
        <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02]">
          <p className="text-[9px] text-white/20 text-center">
            {isOnline
              ? 'Online: Can browse web, search, fetch APIs'
              : 'Offline: Apps, files, system, keyboard only'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
