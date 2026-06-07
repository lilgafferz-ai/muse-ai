import React, { useState } from 'react';
import { Terminal, CheckCircle, XCircle, ChevronDown, ChevronRight, AppWindow, Search, FileText, Keyboard, Play, Globe } from 'lucide-react';

const TOOL_ICONS = {
  app: AppWindow,
  browser: Globe,
  file: FileText,
  input: Keyboard,
  system: Terminal,
  media: Play,
};

const TOOL_COLORS = {
  app: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  browser: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  file: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  input: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  system: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  media: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
};

export default function ToolCall({ tool }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[tool.tool] || Terminal;
  const colors = TOOL_COLORS[tool.tool] || TOOL_COLORS.system;

  return (
    <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${
      tool.success ? colors.border : 'border-red-500/20'
    } ${colors.bg} backdrop-blur-sm`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? <ChevronDown size={12} className="shrink-0 text-white/40" /> : <ChevronRight size={12} className="shrink-0 text-white/40" />}
        
        <div className={`w-5 h-5 rounded ${colors.bg} flex items-center justify-center`}>
          <Icon size={12} className={colors.text} />
        </div>

        <span className={`text-xs font-medium ${colors.text}`}>
          {tool.tool}
        </span>

        {tool.success ? (
          <CheckCircle size={12} className="text-green-400 ml-auto shrink-0" />
        ) : (
          <XCircle size={12} className="text-red-400 ml-auto shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 pt-0">
          {tool.result && (
            <pre className="text-[10px] text-white/60 font-mono bg-deep-950/50 rounded p-2 overflow-x-auto max-h-24 overflow-y-auto">
              {typeof tool.result === 'object'
                ? JSON.stringify(tool.result, null, 2).slice(0, 500)
                : String(tool.result).slice(0, 500)
              }
            </pre>
          )}
          {tool.error && (
            <p className="text-[10px] text-red-400/80 mt-1">{tool.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
