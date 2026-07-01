import React, { useState, useEffect } from 'react';
import {
  Terminal, Brain, Zap, Activity, Clock, MessageSquare,
  Eye, Code, Database, ChevronDown, ChevronRight,
  Copy, Check, RefreshCw, X, Hash
} from 'lucide-react';
import { useNexora } from '../context/NexoraContext';
import api from '../services/api';

function MetricCard({ label, value, unit, icon: Icon, color = 'text-muse-400' }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white/35 text-xs">{label}</span>
        <Icon size={13} className={color} />
      </div>
      <p className="text-xl font-bold text-white font-mono">{value}</p>
      {unit && <p className="text-white/25 text-[10px]">{unit}</p>}
    </div>
  );
}

function ReasoningTrace({ trace }) {
  const [open, setOpen] = useState(true);

  if (!trace) {
    return (
      <div className="glass-card p-6 text-center">
        <Brain size={28} className="text-white/15 mx-auto mb-3" />
        <p className="text-white/30 text-sm">No reasoning trace yet.</p>
        <p className="text-white/20 text-xs mt-1">Send a message to see the AI's thought process here.</p>
      </div>
    );
  }

  const steps = [
    { label: 'Goal Understanding', key: 'goal',     icon: '🎯', color: 'text-blue-400' },
    { label: 'Context Retrieved',  key: 'context',  icon: '📋', color: 'text-purple-400' },
    { label: 'Memories Used',      key: 'memories', icon: '🧠', color: 'text-green-400' },
    { label: 'Reasoning',          key: 'reasoning',icon: '💭', color: 'text-yellow-400' },
    { label: 'Self-Review',        key: 'review',   icon: '✅', color: 'text-cyan-400' },
    { label: 'Final Answer',       key: 'answer',   icon: '💬', color: 'text-muse-400' },
  ];

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-muse-400" />
          <span className="text-white/80 text-sm font-medium">Reasoning Trace</span>
        </div>
        {open ? <ChevronDown size={14} className="text-white/30" /> : <ChevronRight size={14} className="text-white/30" />}
      </button>
      {open && (
        <div className="divide-y divide-white/[0.04]">
          {steps.map(step => {
            const content = trace[step.key];
            if (!content) return null;
            return (
              <div key={step.key} className="reasoning-step px-5">
                <span className="text-base flex-shrink-0 mt-0.5">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${step.color}`}>{step.label}</p>
                  <p className="text-white/60 text-xs leading-relaxed font-mono whitespace-pre-wrap">{content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PromptInspector({ prompt }) {
  const [copied, setCopied] = useState(false);

  if (!prompt) {
    return (
      <div className="glass-card p-6 text-center">
        <Code size={28} className="text-white/15 mx-auto mb-3" />
        <p className="text-white/30 text-sm">No prompt to inspect yet.</p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Code size={14} className="text-cyan-400" />
          <span className="text-white/80 text-sm font-medium">Prompt Inspector</span>
          <span className="badge text-[10px]">{prompt.length} chars</span>
        </div>
        <button onClick={handleCopy} className="btn-ghost p-1.5 text-xs">
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
        </button>
      </div>
      <div className="p-4 max-h-64 overflow-y-auto">
        <pre className="text-xs text-white/55 font-mono whitespace-pre-wrap leading-relaxed">{prompt}</pre>
      </div>
    </div>
  );
}

function ApiLogs({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Activity size={28} className="text-white/15 mx-auto mb-3" />
        <p className="text-white/30 text-sm">No API calls logged yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
        <Activity size={14} className="text-green-400" />
        <span className="text-white/80 text-sm font-medium">API Log</span>
        <span className="badge-green badge text-[10px]">{logs.length}</span>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
        {logs.map((log, i) => (
          <div key={i} className={`log-entry ${log.type || ''}`}>
            <span className="text-white/25 mr-3 select-none">{new Date(log.ts).toISOString().split('T')[1].slice(0, 12)}</span>
            <span className={`mr-2 ${log.method === 'POST' ? 'text-blue-400' : 'text-green-400'}`}>{log.method}</span>
            <span>{log.path}</span>
            {log.status && <span className={`ml-3 ${log.status < 400 ? 'text-green-400' : 'text-red-400'}`}>{log.status}</span>}
            {log.ms && <span className="ml-3 text-white/25">{log.ms}ms</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DevModeView() {
  const { devMode, setDevMode } = useNexora();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('trace');

  // In a real integration these would be populated from the last chat response metadata
  const lastTrace = null; // Would come from useChat context
  const lastPrompt = null;
  const apiLogs = [];

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.status();
        setStatus(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const metrics = status ? [
    { label: 'AI Provider', value: status.ai?.provider || 'N/A', unit: status.ai?.model || '', icon: Brain, color: 'text-muse-400' },
    { label: 'AI Status', value: status.services?.ai === 'connected' ? '✓' : '✗', unit: status.services?.ai, icon: Zap, color: status.services?.ai === 'connected' ? 'text-green-400' : 'text-red-400' },
    { label: 'MongoDB', value: status.services?.mongodb === 'connected' ? '✓' : '✗', unit: status.services?.mongodb, icon: Database, color: status.services?.mongodb === 'connected' ? 'text-green-400' : 'text-red-400' },
    { label: 'Memory',  value: `${status.agent?.tools || 0}`, unit: 'tools registered', icon: Hash, color: 'text-blue-400' },
  ] : [];

  const tabs = [
    { id: 'trace', label: 'Reasoning Trace' },
    { id: 'prompt', label: 'Prompt Inspector' },
    { id: 'logs', label: 'API Logs' },
    { id: 'system', label: 'System' },
  ];

  if (!devMode) {
    return (
      <div className="view-container flex-center">
        <div className="text-center space-y-4 max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex-center mx-auto">
            <Terminal size={28} className="text-white/20" />
          </div>
          <h2 className="text-white font-semibold text-lg">Developer Mode is off</h2>
          <p className="text-white/40 text-sm">Enable Developer Mode to access reasoning logs, prompt inspection, token metrics, and API monitoring.</p>
          <button onClick={() => setDevMode(true)} className="btn-primary mx-auto">
            <Terminal size={15} /> Enable Dev Mode
          </button>
          <p className="text-white/20 text-xs">You can also enable this in Settings → Developer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-white font-display font-bold text-xl flex items-center gap-2">
              <Terminal size={20} className="text-muse-400" /> Dev Mode
            </h1>
            <p className="text-white/35 text-xs mt-0.5">Reasoning logs · Prompt inspector · System metrics</p>
          </div>
          <button onClick={() => setDevMode(false)} className="btn-ghost text-xs gap-1">
            <X size={12} /> Disable
          </button>
        </div>

        {/* Metrics */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {metrics.map(m => <MetricCard key={m.label} {...m} />)}
          </div>
        )}

        {/* Notice banner */}
        <div className="p-4 rounded-xl bg-muse-500/8 border border-muse-500/20 flex items-start gap-3 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <Brain size={16} className="text-muse-400 flex-shrink-0 mt-0.5" />
          <p className="text-muse-200 text-sm leading-relaxed">
            The reasoning trace, prompt, and token data shown here come from the <strong>last AI response</strong>.
            Send a message in Chat view to populate these panels. Reasoning logs include goal understanding,
            context retrieved, memories used, internal reasoning, self-review notes, and the final answer.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 ${
                tab === t.id ? 'text-muse-300 border-muse-500' : 'text-white/35 border-transparent hover:text-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {tab === 'trace'  && <ReasoningTrace trace={lastTrace} />}
          {tab === 'prompt' && <PromptInspector prompt={lastPrompt} />}
          {tab === 'logs'   && <ApiLogs logs={apiLogs} />}
          {tab === 'system' && status && (
            <div className="glass-card p-5 space-y-4">
              <p className="section-label">System Information</p>
              <div className="font-mono text-xs space-y-2 text-white/50">
                {Object.entries({
                  'Status':      status.status,
                  'Version':     status.version,
                  'Name':        status.name,
                  'Platform':    status.system?.platform,
                  'Node.js':     status.system?.nodeVersion,
                  'Memory':      status.system?.memory,
                  'Mode':        status.agent?.mode,
                  'Tools total': status.agent?.tools,
                  'Tools online':status.agent?.toolsOnline,
                  'Connectivity':status.connectivity?.isOnline ? 'Online' : 'Offline',
                }).map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <span className="text-white/25 w-32 flex-shrink-0">{k}</span>
                    <span className="text-white/65">{String(v ?? 'N/A')}</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <button onClick={async () => {
                const d = await api.status();
                setStatus(d);
              }} className="btn-secondary text-sm w-full">
                <RefreshCw size={14} /> Refresh Status
              </button>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
