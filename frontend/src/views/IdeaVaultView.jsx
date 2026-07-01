import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Lightbulb, Star, Trash2, Pin, Loader, X,
  TrendingUp, Zap, Clock, Tag, ChevronDown, Brain,
  Sparkles, BarChart3, Edit3, Save, Filter
} from 'lucide-react';
import ideasApi from '../services/ideasApi';

const STATUS_OPTIONS = [
  { value: 'raw',      label: 'Raw',      color: 'badge' },
  { value: 'explored', label: 'Explored', color: 'badge-blue' },
  { value: 'building', label: 'Building', color: 'badge-green' },
  { value: 'shelved',  label: 'Shelved',  color: 'badge-amber' },
];

function ScoreBar({ label, value, color = 'bg-muse-500' }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/40">{label}</span>
        <span className="text-white/60">{value || 0}/10</span>
      </div>
      <div className="h-1 bg-white/8 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${(value || 0) * 10}%` }}
        />
      </div>
    </div>
  );
}

function IdeaCard({ idea, onPin, onDelete, onScore, onUpdate, selected, onSelect }) {
  const [scoring, setScoring] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(idea.body || '');

  const handleScore = async (e) => {
    e.stopPropagation();
    setScoring(true);
    await onScore(idea._id);
    setScoring(false);
  };

  const handleSave = async () => {
    await onUpdate(idea._id, { title, body });
    setEditing(false);
  };

  const statusConfig = STATUS_OPTIONS.find(s => s.value === idea.status) || STATUS_OPTIONS[0];
  const hasScores = idea.scores?.overall;

  return (
    <div
      className={`glass-card p-5 flex flex-col gap-4 cursor-pointer transition-all duration-200 ${selected ? 'border-muse-500/30 ring-1 ring-muse-500/20' : ''}`}
      onClick={() => onSelect(idea)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className="input-nexora text-sm font-semibold"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">{idea.title}</h3>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {idea.pinned && <Pin size={12} className="text-muse-400" />}
          <button onClick={() => onPin(idea._id)} className="btn-ghost p-1.5 text-white/20 hover:text-muse-400">
            <Pin size={12} />
          </button>
          {editing ? (
            <>
              <button onClick={e => { e.stopPropagation(); handleSave(); }} className="btn-ghost p-1.5 text-green-400"><Save size={12} /></button>
              <button onClick={e => { e.stopPropagation(); setEditing(false); }} className="btn-ghost p-1.5"><X size={12} /></button>
            </>
          ) : (
            <button onClick={e => { e.stopPropagation(); setEditing(true); }} className="btn-ghost p-1.5"><Edit3 size={12} /></button>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(idea._id); }} className="btn-ghost p-1.5 text-white/15 hover:text-red-400">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <textarea
          className="textarea-nexora text-xs"
          rows={3}
          value={body}
          onChange={e => setBody(e.target.value)}
          onClick={e => e.stopPropagation()}
          placeholder="Describe your idea..."
        />
      ) : idea.body ? (
        <p className="text-white/45 text-xs leading-relaxed line-clamp-3">{idea.body}</p>
      ) : null}

      {/* Scores */}
      {hasScores && (
        <div className="space-y-2 pt-1">
          <ScoreBar label="Business Value" value={idea.scores.business} color="bg-green-500" />
          <ScoreBar label="Technical Fit"  value={idea.scores.technical} color="bg-blue-500" />
          <ScoreBar label="Difficulty"     value={idea.scores.difficulty} color="bg-orange-500" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-white/30">Overall Score</span>
            <span className="text-muse-300 font-bold text-sm">{idea.scores.overall}/10</span>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {idea.aiAnalysis && (
        <p className="text-white/40 text-xs italic leading-relaxed border-l-2 border-muse-500/30 pl-3">
          {idea.aiAnalysis}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className={`badge text-[10px] ${statusConfig.color}`}>{statusConfig.label}</span>
        <div className="flex items-center gap-2">
          {idea.tags?.slice(0, 2).map(t => (
            <span key={t} className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-md">{t}</span>
          ))}
          {!hasScores ? (
            <button
              onClick={handleScore}
              disabled={scoring}
              className="flex items-center gap-1 text-[10px] text-muse-400 hover:text-muse-300 transition-colors px-2 py-1 rounded-lg bg-muse-500/10 hover:bg-muse-500/20"
            >
              {scoring ? <Loader size={10} className="animate-spin" /> : <Sparkles size={10} />}
              Score with AI
            </button>
          ) : (
            <button
              onClick={handleScore}
              disabled={scoring}
              className="btn-ghost p-1 text-[10px]"
              title="Re-score"
            >
              {scoring ? <Loader size={10} className="animate-spin" /> : <BarChart3 size={10} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IdeaVaultView() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCapture, setShowCapture] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', status: 'raw', tags: '' });
  const [saving, setSaving] = useState(false);
  const captureRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ideasApi.list();
      setIdeas(data.ideas || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Keyboard shortcut: I to open capture
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'c' || e.key === 'C') setShowCapture(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (showCapture) captureRef.current?.focus();
  }, [showCapture]);

  const handleCapture = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const data = await ideasApi.create({ ...form, tags });
      setIdeas(prev => [data.idea, ...prev]);
      setForm({ title: '', body: '', status: 'raw', tags: '' });
      setShowCapture(false);
    } catch {}
    setSaving(false);
  };

  const handlePin = async (id) => {
    await ideasApi.pin(id);
    setIdeas(prev => prev.map(i => i._id === id ? { ...i, pinned: !i.pinned } : i));
  };

  const handleDelete = async (id) => {
    await ideasApi.delete(id);
    setIdeas(prev => prev.filter(i => i._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const handleScore = async (id) => {
    const data = await ideasApi.score(id);
    setIdeas(prev => prev.map(i => i._id === id ? data.idea : i));
    if (selected?._id === id) setSelected(data.idea);
    return data;
  };

  const handleUpdate = async (id, updates) => {
    const data = await ideasApi.update(id, updates);
    setIdeas(prev => prev.map(i => i._id === id ? data.idea : i));
  };

  const filtered = ideas.filter(i => filter === 'all' || i.status === filter || (filter === 'pinned' && i.pinned));

  return (
    <div className="view-container">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between animate-slide-up">
          <div>
            <h1 className="text-white font-display font-bold text-xl">Idea Vault</h1>
            <p className="text-white/35 text-xs mt-0.5">{ideas.length} ideas · {ideas.filter(i => i.pinned).length} pinned</p>
          </div>
          <button onClick={() => setShowCapture(true)} className="btn-primary text-sm">
            <Plus size={15} /> Capture Idea <span className="text-white/40 text-[10px] font-mono ml-1">C</span>
          </button>
        </div>

        {/* Quick Capture Modal */}
        {showCapture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-lg mx-4 p-6 space-y-4 animate-scale-in shadow-nexora-lg">
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold">⚡ Capture Idea</p>
                <button onClick={() => setShowCapture(false)} className="btn-ghost p-1"><X size={16} /></button>
              </div>
              <input
                ref={captureRef}
                className="input-nexora text-base"
                placeholder="What's the idea?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCapture()}
              />
              <textarea
                className="textarea-nexora text-sm"
                rows={3}
                placeholder="Describe it further... (optional)"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              />
              <div className="flex gap-3">
                <select
                  className="input-nexora py-2 text-sm flex-1"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input
                  className="input-nexora py-2 text-sm flex-1"
                  placeholder="Tags (comma-separated)"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCapture} disabled={saving || !form.title.trim()} className="btn-primary flex-1 text-sm">
                  {saving ? <Loader size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                  Save Idea
                </button>
                <button onClick={() => setShowCapture(false)} className="btn-ghost px-4"><X size={14} /></button>
              </div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'pinned', label: '📌 Pinned' },
            ...STATUS_OPTIONS.map(s => ({ id: s.value, label: s.label }))
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                filter === f.id
                  ? 'bg-muse-500/15 text-muse-300 border border-muse-500/25'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 shimmer rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-center flex-col gap-4 py-20 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex-center">
              <Lightbulb size={28} className="text-white/15" />
            </div>
            <div>
              <p className="text-white/50 font-medium">No ideas yet</p>
              <p className="text-white/25 text-sm mt-1">Press C to capture your next big idea</p>
            </div>
            <button onClick={() => setShowCapture(true)} className="btn-primary">
              <Plus size={15} /> Capture First Idea
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {filtered.map(idea => (
              <IdeaCard
                key={idea._id}
                idea={idea}
                selected={selected?._id === idea._id}
                onSelect={setSelected}
                onPin={handlePin}
                onDelete={handleDelete}
                onScore={handleScore}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
