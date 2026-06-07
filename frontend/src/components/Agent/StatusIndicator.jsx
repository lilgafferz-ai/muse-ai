import React from 'react';
import { Wifi, WifiOff, Cpu } from 'lucide-react';

export default function StatusIndicator({ isOnline, isAgent, toolsUsed }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      {/* Online/Offline badge */}
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
        transition-all duration-300 ${
        isOnline
          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
          : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
      }`}>
        {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Agent Mode badge */}
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium
        transition-all duration-300 ${
        isAgent
          ? 'bg-muse-500/10 text-muse-400 border border-muse-500/20'
          : 'bg-white/5 text-white/30 border border-white/10'
      }`}>
        <Cpu size={10} />
        <span>{isAgent ? 'Agent' : 'Chat'}</span>
      </div>

      {/* Tools used count */}
      {toolsUsed > 0 && (
        <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 
                        border border-blue-500/20 text-[10px] font-medium">
          {toolsUsed} tool{toolsUsed !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
