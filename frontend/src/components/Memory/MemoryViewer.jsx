import React, { useState, useEffect } from 'react';
import { Brain, Heart, Target, FileText, Trash2, Search, Loader, Sparkles } from 'lucide-react';
import { useMemories } from '../../hooks/useMemories';

const TYPE_CONFIG = {
  preference: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10', label: 'Preferences' },
  emotion: { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Emotions' },
  fact: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Facts' },
  goal: { icon: Target, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Goals' },
};

export default function MemoryViewer() {
  const { memories, grouped, stats, loading, deleteMemory, fetchMemories } = useMemories();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All', count: memories.length },
    ...Object.entries(TYPE_CONFIG).map(([type, config]) => ({
      id: type,
      label: config.label,
      count: grouped[type]?.length || 0
    }))
  ];

  const filteredMemories = memories.filter(m => {
    if (activeTab !== 'all' && m.type !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.key?.toLowerCase().includes(q) || m.value?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDelete = async (id) => {
    const success = await deleteMemory(id);
    if (success) fetchMemories();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size={24} className="text-muse-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-muse-500 to-muse-700 
                        flex items-center justify-center shadow-lg shadow-muse-500/20">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white">Memory</h2>
            <p className="text-[11px] text-white/40">
              {stats?.total || 0} memories stored
              {stats?.chromaCount > 0 && ` · ${stats.chromaCount} indexed`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-deep-900/60 border border-white/5 rounded-lg pl-8 pr-3 py-2
                     text-sm text-white/80 placeholder-white/20 outline-none
                     focus:border-muse-500/30 focus:ring-1 focus:ring-muse-500/20
                     transition-all duration-200"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-muse-500/20 text-muse-300'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-muse-500/30' : 'bg-white/10'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredMemories.length === 0 && (
          <div className="text-center py-12">
            <Brain size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No memories found</p>
            <p className="text-white/20 text-xs mt-1">
              Memories are created automatically during conversation
            </p>
          </div>
        )}

        {filteredMemories.map(memory => {
          const config = TYPE_CONFIG[memory.type] || TYPE_CONFIG.fact;
          const Icon = config.icon;

          return (
            <div
              key={memory._id}
              className="glass-card rounded-lg p-3 group hover:bg-deep-900/80 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={14} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                      {memory.key}
                    </span>
                    <div className={`h-1 rounded-full ${
                      memory.importance >= 7 ? 'bg-muse-500 w-6' :
                      memory.importance >= 4 ? 'bg-muse-500/50 w-3' :
                      'bg-white/10 w-1.5'
                    }`} />
                  </div>
                  <p className="text-sm text-white/80 truncate">{memory.value}</p>
                  <p className="text-[10px] text-white/20 mt-1">
                    {new Date(memory.createdAt).toLocaleDateString()}
                    {memory.context && ` · ${memory.context.slice(0, 60)}...`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(memory._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200
                           text-white/20 hover:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
