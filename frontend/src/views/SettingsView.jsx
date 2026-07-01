import React, { useState } from 'react';
import {
  Palette, Brain, Mic, Shield, Cpu, Plug, Keyboard,
  Terminal, Key, Archive, Moon, Sun, Monitor,
  Volume2, VolumeX, Lock, Cloud, Download, Upload,
  ChevronRight, Check, AlertCircle, Info, X,
  Zap, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { useNexora } from '../context/NexoraContext';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-muse-500/15 flex-center">
          <Icon size={14} className="text-muse-400" />
        </div>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-white/80 text-sm">{label}</p>
        {description && <p className="text-white/35 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 ${value ? 'bg-muse-500' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div>
      <p className="text-white/60 text-sm mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all duration-200 ${
              value === opt.value
                ? 'bg-muse-500/15 text-muse-300 border-muse-500/30'
                : 'bg-white/[0.03] text-white/50 border-white/8 hover:border-white/15 hover:text-white/70'
            }`}
          >
            {opt.icon && <opt.icon size={13} />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ApiKeyInput({ label, storageKey, placeholder }) {
  const [value, setValue] = useState(() => localStorage.getItem(storageKey) || '');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (value.trim()) localStorage.setItem(storageKey, value.trim());
    else localStorage.removeItem(storageKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-white/60 text-sm">{label}</p>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            className="input-nexora pr-10 font-mono text-sm"
            type={show ? 'text' : 'password'}
            placeholder={placeholder}
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <button
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button onClick={handleSave} className={`btn-secondary px-4 text-sm flex-shrink-0 ${saved ? 'text-green-400' : ''}`}>
          {saved ? <Check size={14} /> : <Key size={14} />}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Open command palette' },
  { keys: ['G', 'H'], action: 'Go to Home' },
  { keys: ['G', 'C'], action: 'Go to Chat' },
  { keys: ['G', 'P'], action: 'Go to Projects' },
  { keys: ['G', 'L'], action: 'Go to Planner' },
  { keys: ['G', 'I'], action: 'Go to Ideas' },
  { keys: ['G', 'K'], action: 'Go to Knowledge' },
  { keys: ['G', 'D'], action: 'Go to Dev Mode' },
  { keys: ['G', 'S'], action: 'Go to Settings' },
  { keys: ['N'], action: 'New chat' },
  { keys: ['C'], action: 'Capture idea (in Idea Vault)' },
  { keys: ['Esc'], action: 'Close modal / overlay' },
];

const PLUGINS = [
  { id: 'github',    label: 'GitHub',         icon: '🐙', desc: 'Connect repositories, issues, PRs', available: false },
  { id: 'notion',    label: 'Notion',          icon: '📝', desc: 'Sync notes and databases',          available: false },
  { id: 'gcal',      label: 'Google Calendar', icon: '📅', desc: 'View and manage events',            available: false },
  { id: 'gdrive',    label: 'Google Drive',    icon: '📁', desc: 'Access files and documents',        available: false },
  { id: 'slack',     label: 'Slack',           icon: '💬', desc: 'Messages and notifications',        available: false },
  { id: 'vscode',    label: 'VS Code',         icon: '💻', desc: 'Open files in editor',             available: false },
  { id: 'figma',     label: 'Figma',           icon: '🎨', desc: 'Design file metadata',             available: false },
  { id: 'jira',      label: 'Jira',            icon: '🔵', desc: 'Issues and sprints',               available: false },
];

export default function SettingsView() {
  const { devMode, setDevMode, theme, setTheme } = useNexora();
  const [activeSection, setActiveSection] = useState('appearance');
  const [localFirst, setLocalFirst] = useState(() => localStorage.getItem('nexora_localFirst') === 'true');
  const [autoSaveMemory, setAutoSaveMemory] = useState(() => localStorage.getItem('nexora_autoMemory') !== 'false');
  const [streamingEnabled, setStreamingEnabled] = useState(() => localStorage.getItem('nexora_streaming') !== 'false');
  const [voiceSpeed, setVoiceSpeed] = useState(() => localStorage.getItem('nexora_voiceSpeed') || '1');
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('nexora_aiProvider') || 'openrouter');

  const persist = (key, value) => localStorage.setItem(key, String(value));

  const sections = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai',         label: 'AI & Models', icon: Cpu },
    { id: 'memory',     label: 'Memory',      icon: Brain },
    { id: 'voice',      label: 'Voice',       icon: Mic },
    { id: 'privacy',    label: 'Privacy',     icon: Shield },
    { id: 'plugins',    label: 'Plugins',     icon: Plug },
    { id: 'shortcuts',  label: 'Shortcuts',   icon: Keyboard },
    { id: 'developer',  label: 'Developer',   icon: Terminal },
    { id: 'backup',     label: 'Backup',      icon: Archive },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-52 flex-shrink-0 border-r border-white/5 p-3 space-y-1 overflow-y-auto">
        <p className="section-label px-3 py-2">Settings</p>
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`nav-item ${activeSection === s.id ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-6">

          {/* Appearance */}
          {activeSection === 'appearance' && (
            <Section icon={Palette} title="Appearance">
              <RadioGroup
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'dark',   label: 'Dark',   icon: Moon },
                  { value: 'darker', label: 'Darker', icon: Monitor },
                  { value: 'amoled', label: 'AMOLED', icon: Sun },
                ]}
              />
              <div className="divider" />
              <div className="grid grid-cols-2 gap-3">
                {['Space Grotesk', 'Inter', 'Outfit', 'Plus Jakarta Sans'].map(f => (
                  <button key={f} className="p-3 rounded-xl bg-white/[0.03] border border-white/8 hover:border-muse-500/30 transition-all text-left">
                    <p className="text-white/80 text-sm font-medium" style={{ fontFamily: f }}>{f}</p>
                    <p className="text-white/30 text-xs mt-0.5" style={{ fontFamily: f }}>The quick brown fox</p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* AI & Models */}
          {activeSection === 'ai' && (
            <Section icon={Cpu} title="AI & Models">
              <RadioGroup
                label="AI Provider"
                value={aiProvider}
                onChange={v => { setAiProvider(v); persist('nexora_aiProvider', v); }}
                options={[
                  { value: 'openrouter', label: 'OpenRouter' },
                  { value: 'ollama',     label: 'Ollama (Local)' },
                  { value: 'openai',     label: 'OpenAI' },
                  { value: 'anthropic',  label: 'Anthropic' },
                  { value: 'gemini',     label: 'Google Gemini' },
                ]}
              />
              <div className="divider" />
              <ApiKeyInput label="OpenRouter API Key" storageKey="OPENROUTER_API_KEY" placeholder="sk-or-..." />
              <ApiKeyInput label="OpenAI API Key" storageKey="OPENAI_API_KEY" placeholder="sk-..." />
              <ApiKeyInput label="Anthropic API Key" storageKey="ANTHROPIC_API_KEY" placeholder="sk-ant-..." />
              <ApiKeyInput label="Google Gemini API Key" storageKey="GEMINI_API_KEY" placeholder="AIza..." />
              <div className="divider" />
              <Toggle
                label="Streaming responses"
                description="Show responses word-by-word as they generate"
                value={streamingEnabled}
                onChange={v => { setStreamingEnabled(v); persist('nexora_streaming', v); }}
              />
              <Toggle
                label="Reasoning mode"
                description="AI thinks step-by-step before answering (slower but more accurate)"
                value={devMode}
                onChange={setDevMode}
              />
            </Section>
          )}

          {/* Memory */}
          {activeSection === 'memory' && (
            <Section icon={Brain} title="Memory">
              <Toggle
                label="Auto-save memories"
                description="Automatically extract and save important information from conversations"
                value={autoSaveMemory}
                onChange={v => { setAutoSaveMemory(v); persist('nexora_autoMemory', v); }}
              />
              <div className="divider" />
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <p className="text-amber-400 text-xs flex items-start gap-2">
                  <Info size={13} className="flex-shrink-0 mt-0.5" />
                  Memory is stored in ChromaDB for semantic search and MongoDB for persistence. Manage individual memories in the Memory view.
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm flex-1">
                  <Download size={14} /> Export Memories
                </button>
                <button className="btn-danger text-sm flex-1">
                  <X size={14} /> Clear All
                </button>
              </div>
            </Section>
          )}

          {/* Voice */}
          {activeSection === 'voice' && (
            <Section icon={Mic} title="Voice">
              <div>
                <p className="text-white/60 text-sm mb-2">Speech Speed</p>
                <input
                  type="range" min="0.5" max="2" step="0.1"
                  value={voiceSpeed}
                  onChange={e => { setVoiceSpeed(e.target.value); persist('nexora_voiceSpeed', e.target.value); }}
                  className="w-full accent-muse-500"
                />
                <div className="flex justify-between text-[10px] text-white/25 mt-1">
                  <span>Slow</span><span>{voiceSpeed}x</span><span>Fast</span>
                </div>
              </div>
              <div className="divider" />
              <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20">
                <p className="text-blue-300 text-xs">
                  Wake word uses Picovoice Porcupine. See WAKE_WORD_SETUP.md for setup instructions.
                </p>
              </div>
            </Section>
          )}

          {/* Privacy */}
          {activeSection === 'privacy' && (
            <Section icon={Shield} title="Privacy & Security">
              <Toggle
                label="Local-first mode"
                description="Never send data to the cloud. Requires local Ollama AI"
                value={localFirst}
                onChange={v => { setLocalFirst(v); persist('nexora_localFirst', v); }}
              />
              <div className="divider" />
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8 space-y-2">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Data Storage</p>
                <div className="space-y-1.5 text-xs text-white/50">
                  <p>• Chat history: MongoDB (your server)</p>
                  <p>• Memory embeddings: ChromaDB (your server)</p>
                  <p>• Local SQLite: Browser IndexedDB</p>
                  <p>• API keys: Browser localStorage only</p>
                </div>
              </div>
            </Section>
          )}

          {/* Plugins */}
          {activeSection === 'plugins' && (
            <Section icon={Plug} title="Plugins">
              <div className="grid grid-cols-1 gap-3">
                {PLUGINS.map(plugin => (
                  <div key={plugin.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/8">
                    <span className="text-2xl">{plugin.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-medium">{plugin.label}</p>
                      <p className="text-white/35 text-xs">{plugin.desc}</p>
                    </div>
                    <span className="badge-amber text-[10px] badge flex-shrink-0">Coming Soon</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Shortcuts */}
          {activeSection === 'shortcuts' && (
            <Section icon={Keyboard} title="Keyboard Shortcuts">
              <div className="space-y-2">
                {SHORTCUTS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-white/65 text-sm">{s.action}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <React.Fragment key={k}>
                          {j > 0 && <span className="text-white/20 text-xs">+</span>}
                          <kbd className="px-2 py-0.5 rounded-md bg-white/8 border border-white/12 text-white/60 text-[11px] font-mono">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Developer */}
          {activeSection === 'developer' && (
            <Section icon={Terminal} title="Developer Mode">
              <Toggle
                label="Enable Developer Mode"
                description="Access reasoning logs, prompt inspector, token metrics, and API logs"
                value={devMode}
                onChange={setDevMode}
              />
              {devMode && (
                <div className="p-3 rounded-xl bg-muse-500/8 border border-muse-500/20">
                  <p className="text-muse-300 text-xs">
                    Dev Mode is active. Navigate to the Dev Mode panel (G D) to inspect AI reasoning, prompts, and performance metrics.
                  </p>
                </div>
              )}
              <div className="divider" />
              <div className="space-y-2">
                <p className="text-white/40 text-xs">Build info</p>
                <div className="font-mono text-xs text-white/30 space-y-1">
                  <p>NEXORA v1.0.0</p>
                  <p>Stack: Vite + React 18, Node.js + Express, MongoDB + ChromaDB</p>
                  <p>AI: Ollama / OpenRouter abstraction</p>
                  <p>Local: WebLLM + Xenova Transformers + SQLite</p>
                </div>
              </div>
            </Section>
          )}

          {/* Backup */}
          {activeSection === 'backup' && (
            <Section icon={Archive} title="Backup & Export">
              <div className="grid grid-cols-2 gap-3">
                <button className="btn-secondary text-sm flex-col gap-2 py-4 items-center">
                  <Download size={18} />
                  Export All Data
                </button>
                <button className="btn-secondary text-sm flex-col gap-2 py-4 items-center">
                  <Upload size={18} />
                  Import Data
                </button>
              </div>
              <div className="divider" />
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8">
                <p className="text-white/40 text-xs leading-relaxed">
                  Export creates a JSON file containing all your chats, memories, projects, tasks, ideas, and knowledge nodes.
                  Import merges the data without overwriting existing records.
                </p>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
