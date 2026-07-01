import React, { useState, useEffect } from 'react';
import {
  Plus, Network, Trash2, Edit3, Save, X, Tag,
  User, FolderOpen, Lightbulb, FileCode, Wrench,
  Building2, StickyNote, Loader, ChevronRight,
  Link2, Brain
} from 'lucide-react';
import knowledgeApi from '../services/knowledgeApi';

const NODE_TYPES = [
  { value: 'person',   label: 'Person',   icon: User,       color: 'bg-blue-500/20 text-blue-300',   border: 'border-blue-500/30' },
  { value: 'project',  label: 'Project',  icon: FolderOpen, color: 'bg-muse-500/20 text-muse-300',   border: 'border-muse-500/30' },
  { value: 'concept',  label: 'Concept',  icon: Brain,      color: 'bg-purple-500/20 text-purple-300', border: 'border-purple-500/30' },
  { value: 'tool',     label: 'Tool',     icon: Wrench,     color: 'bg-green-500/20 text-green-300', border: 'border-green-500/30' },
  { value: 'company',  label: 'Company',  icon: Building2,  color: 'bg-yellow-500/20 text-yellow-300',border: 'border-yellow-500/30' },
  { value: 'code',     label: 'Code',     icon: FileCode,   color: 'bg-cyan-500/20 text-cyan-300',   border: 'border-cyan-500/30' },
  { value: 'note',     label: 'Note',     icon: StickyNote, color: 'bg-pink-500/20 text-pink-300',   border: 'border-pink-500/30' },
];

function getTypeConfig(type) {
  return NODE_TYPES.find(t => t.value === type) || NODE_TYPES[2];
}

function NodeCard({ node, onSelect, onDelete, selected }) {
  const tc = getTypeConfig(node.type);
  const Icon = tc.icon;

  return (
    <div
      className={`glass-card p-4 flex flex-col gap-3 cursor-pointer group transition-all duration-200 ${selected ? 'border-muse-500/30 ring-1 ring-muse-500/20' : ''}`}
      onClick={() => onSelect(node)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${tc.color} flex-center flex-shrink-0`}>
            <Icon size={14} />
          </div>
          <div>
            <p className="text-white text-sm font-medium">{node.name}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{tc.label}</p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(node._id); }}
          className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {node.description && (
        <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{node.description}</p>
      )}

      {node.relationships?.length > 0 && (
        <div className="flex items-center gap-1 text-white/25 text-[10px]">
          <Link2 size={10} />
          <span>{node.relationships.length} connection{node.relationships.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {node.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-md">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function NodeDetail({ node, allNodes, onClose, onUpdate, onAddRelation }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.description || '');
  const [showRelate, setShowRelate] = useState(false);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState('relates to');
  const tc = getTypeConfig(node.type);
  const Icon = tc.icon;

  const handleSave = async () => {
    await onUpdate(node._id, { name, description });
    setEditing(false);
  };

  const handleAddRelation = async () => {
    const target = allNodes.find(n => n._id === relTarget);
    if (!target) return;
    await onAddRelation(node._id, { targetId: relTarget, targetName: target.name, type: relType });
    setShowRelate(false);
  };

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-white/5">
        <div className={`w-9 h-9 rounded-xl ${tc.color} flex-center`}>
          <Icon size={16} />
        </div>
        {editing ? (
          <input className="input-nexora flex-1 text-lg font-semibold py-1" value={name} onChange={e => setName(e.target.value)} autoFocus />
        ) : (
          <div className="flex-1">
            <h2 className="text-white font-semibold text-lg">{node.name}</h2>
            <p className="text-white/30 text-xs uppercase tracking-wider">{tc.label}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={handleSave} className="btn-primary text-xs px-3 py-1.5"><Save size={12} /> Save</button>
              <button onClick={() => setEditing(false)} className="btn-ghost p-1.5"><X size={13} /></button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs"><Edit3 size={12} /> Edit</button>
          )}
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <p className="section-label mb-2">Description</p>
          {editing ? (
            <textarea className="textarea-nexora text-sm" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          ) : (
            <p className="text-white/55 text-sm leading-relaxed">{description || <em className="text-white/25">No description</em>}</p>
          )}
        </div>

        {/* Relationships */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Connections</p>
            <button onClick={() => setShowRelate(!showRelate)} className="btn-ghost text-xs gap-1">
              <Plus size={12} /> Add
            </button>
          </div>

          {showRelate && (
            <div className="glass-card p-4 space-y-3 mb-3 animate-slide-down">
              <select className="input-nexora text-sm py-2" value={relTarget} onChange={e => setRelTarget(e.target.value)}>
                <option value="">Select node...</option>
                {allNodes.filter(n => n._id !== node._id).map(n => (
                  <option key={n._id} value={n._id}>{n.name} ({n.type})</option>
                ))}
              </select>
              <input className="input-nexora text-sm" placeholder="Relationship type (e.g. uses, belongs to, references)" value={relType} onChange={e => setRelType(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={handleAddRelation} disabled={!relTarget} className="btn-primary text-sm"><Link2 size={13} /> Connect</button>
                <button onClick={() => setShowRelate(false)} className="btn-ghost text-sm"><X size={13} /></button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {node.relationships?.length > 0 ? (
              node.relationships.map((rel, i) => {
                const rtc = getTypeConfig(allNodes.find(n => n._id === rel.targetId)?.type);
                const RIcon = rtc.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className={`w-6 h-6 rounded-lg ${rtc.color} flex-center flex-shrink-0`}>
                      <RIcon size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm">{rel.targetName}</p>
                      <p className="text-white/30 text-[10px] italic">{rel.type}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-white/25 text-sm text-center py-6">No connections yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeView() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'concept', tags: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await knowledgeApi.list(typeFilter === 'all' ? undefined : typeFilter);
      setNodes(data.nodes || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const data = await knowledgeApi.create({ ...form, tags });
      setNodes(prev => [data.node, ...prev]);
      setForm({ name: '', description: '', type: 'concept', tags: '' });
      setShowCreate(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await knowledgeApi.delete(id);
    setNodes(prev => prev.filter(n => n._id !== id));
    if (selected?._id === id) setSelected(null);
  };

  const handleUpdate = async (id, updates) => {
    const data = await knowledgeApi.update(id, updates);
    setNodes(prev => prev.map(n => n._id === id ? data.node : n));
    setSelected(prev => prev?._id === id ? data.node : prev);
  };

  const handleAddRelation = async (id, rel) => {
    await knowledgeApi.relate(id, rel);
    await load();
  };

  return (
    <div className="flex h-full">
      <div className={`${selected ? 'hidden lg:flex' : 'flex'} flex-col flex-1 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h1 className="text-white font-display font-bold text-xl">Knowledge Graph</h1>
            <p className="text-white/35 text-xs mt-0.5">{nodes.length} nodes · {nodes.reduce((acc, n) => acc + (n.relationships?.length || 0), 0)} connections</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm"><Plus size={15} /> Add Node</button>
        </div>

        {/* Type filter */}
        <div className="flex gap-1 px-6 pt-4 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${typeFilter === 'all' ? 'bg-muse-500/15 text-muse-300 border border-muse-500/25' : 'text-white/35 hover:text-white/60 hover:bg-white/5'}`}
          >
            All
          </button>
          {NODE_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${typeFilter === t.value ? 'bg-muse-500/15 text-muse-300 border border-muse-500/25' : 'text-white/35 hover:text-white/60 hover:bg-white/5'}`}
              >
                <Icon size={11} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mx-6 mt-4 glass-card p-5 animate-slide-down">
            <h3 className="text-white font-semibold text-sm mb-4">Add Knowledge Node</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <input className="input-nexora flex-1" placeholder="Name..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                <select className="input-nexora w-36 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <textarea className="textarea-nexora text-sm" rows={2} placeholder="Description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input className="input-nexora text-sm" placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={saving || !form.name.trim()} className="btn-primary text-sm flex-1">
                  {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />} Add Node
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-ghost px-4"><X size={14} /></button>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 shimmer rounded-2xl" />)}
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex-center flex-col gap-4 py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex-center">
                <Network size={28} className="text-white/15" />
              </div>
              <div>
                <p className="text-white/50 font-medium">Empty knowledge graph</p>
                <p className="text-white/25 text-sm mt-1">Add people, projects, concepts, tools, and code to build your knowledge base</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={15} /> Add First Node</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {nodes.map(node => (
                <NodeCard key={node._id} node={node} onSelect={setSelected} onDelete={handleDelete} selected={selected?._id === node._id} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="flex-1 lg:max-w-md border-l border-white/5 bg-surface-1 flex flex-col overflow-hidden">
          <NodeDetail
            node={selected}
            allNodes={nodes}
            onClose={() => setSelected(null)}
            onUpdate={handleUpdate}
            onAddRelation={handleAddRelation}
          />
        </div>
      )}
    </div>
  );
}
