import React, { useState, useEffect } from 'react';
import {
  Plus, FolderOpen, MoreHorizontal, Trash2, Edit3,
  CheckCircle2, Circle, ArrowRight, Target, Tag,
  ChevronDown, ChevronUp, Loader, Globe, Pause,
  CheckCheck, X, Save, Sparkles
} from 'lucide-react';
import projectsApi from '../services/projectsApi';
import plannerApi from '../services/plannerApi';

const STATUS_COLORS = {
  active:    { dot: 'bg-green-400', label: 'Active',    badge: 'badge-green' },
  paused:    { dot: 'bg-yellow-400', label: 'Paused',  badge: 'badge-amber' },
  completed: { dot: 'bg-muse-400',  label: 'Done',     badge: 'badge' },
};

const PROJECT_COLORS = [
  '#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777','#7c3aed','#0891b2'
];

function ProjectCard({ project, onSelect, onDelete, onUpdate }) {
  const sc = STATUS_COLORS[project.status] || STATUS_COLORS.active;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="glass-card p-5 flex flex-col gap-4 cursor-pointer group" onClick={() => onSelect(project)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: project.color || '#7c3aed' }} />
          <h3 className="text-white font-semibold text-sm">{project.title}</h3>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 glass-strong rounded-xl border border-white/10 shadow-nexora-lg z-10 overflow-hidden" onClick={e => e.stopPropagation()}>
              <button onClick={() => { onSelect(project); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                <Edit3 size={12} /> Open
              </button>
              <button onClick={() => { onDelete(project._id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-white/45 text-xs leading-relaxed line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/35">Progress</span>
          <span className="text-white/50">{project.progress || 0}%</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${project.progress || 0}%`, background: project.color || '#7c3aed' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`badge text-[10px] ${sc.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
        {project.tags?.length > 0 && (
          <div className="flex gap-1">
            {project.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-md">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalList({ goals = [], projectId, onGoalToggle, onGoalAdd }) {
  const [newGoal, setNewGoal] = useState('');

  const handleAdd = async () => {
    if (!newGoal.trim()) return;
    await onGoalAdd(projectId, newGoal.trim());
    setNewGoal('');
  };

  return (
    <div className="space-y-2">
      {goals.map((goal) => (
        <button
          key={goal._id}
          onClick={() => onGoalToggle(projectId, goal._id)}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
        >
          {goal.done
            ? <CheckCircle2 size={16} className="text-muse-400 flex-shrink-0" />
            : <Circle size={16} className="text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
          }
          <span className={`text-sm ${goal.done ? 'line-through text-white/30' : 'text-white/75'}`}>{goal.text}</span>
        </button>
      ))}
      <div className="flex gap-2 mt-3">
        <input
          className="input-nexora text-sm flex-1 py-2"
          placeholder="Add a goal..."
          value={newGoal}
          onChange={e => setNewGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="btn-secondary px-3 py-2 text-sm">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function ProjectWorkspace({ project, onClose, onUpdate }) {
  const [tab, setTab] = useState('goals');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [progress, setProgress] = useState(project.progress || 0);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [goals, setGoals] = useState(project.goals || []);

  useEffect(() => {
    if (tab === 'tasks') {
      setLoadingTasks(true);
      plannerApi.getTasks({ projectId: project._id }).then(data => {
        setTasks(data.tasks || []);
      }).catch(() => {}).finally(() => setLoadingTasks(false));
    }
  }, [tab, project._id]);

  const handleSave = async () => {
    const updated = await projectsApi.update(project._id, { title, description, progress });
    onUpdate(updated.project || { ...project, title, description, progress });
    setEditing(false);
  };

  const handleGoalAdd = async (pid, text) => {
    const data = await projectsApi.addGoal(pid, text);
    setGoals(data.project?.goals || [...goals, { text, done: false }]);
  };

  const handleGoalToggle = async (pid, goalId) => {
    await projectsApi.toggleGoal(pid, goalId);
    setGoals(prev => prev.map(g => g._id === goalId ? { ...g, done: !g.done } : g));
  };

  const tabs = [
    { id: 'goals', label: 'Goals' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-white/5">
        <div className="w-4 h-4 rounded-full" style={{ background: project.color || '#7c3aed' }} />
        {editing ? (
          <input
            className="input-nexora text-lg font-semibold flex-1 py-1"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        ) : (
          <h2 className="text-white font-semibold text-lg flex-1">{title}</h2>
        )}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} className="btn-primary text-xs px-3 py-1.5"><Save size={12} /> Save</button>
              <button onClick={() => setEditing(false)} className="btn-ghost text-xs"><X size={12} /></button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-ghost text-xs"><Edit3 size={12} /> Edit</button>
          )}
          <button onClick={onClose} className="btn-ghost p-2"><X size={16} /></button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: project.color || '#7c3aed' }}
            />
          </div>
          <span className="text-white/50 text-xs w-10 text-right">{progress}%</span>
          {editing && (
            <input
              type="range" min="0" max="100" value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-24"
            />
          )}
        </div>
        {editing && (
          <textarea
            className="textarea-nexora mt-3 text-sm"
            rows={2}
            placeholder="Project description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        )}
        {!editing && description && (
          <p className="text-white/45 text-sm mt-2">{description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 px-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
              tab === t.id
                ? 'text-muse-300 border-muse-500'
                : 'text-white/35 border-transparent hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'goals' && (
          <GoalList goals={goals} projectId={project._id} onGoalToggle={handleGoalToggle} onGoalAdd={handleGoalAdd} />
        )}
        {tab === 'tasks' && (
          <div className="space-y-2">
            {loadingTasks ? (
              <div className="flex-center py-8"><Loader size={16} className="text-white/20 animate-spin" /></div>
            ) : tasks.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">No tasks yet. Add tasks in the Planner.</p>
            ) : (
              tasks.map(task => (
                <div key={task._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'urgent' ? 'bg-red-400' :
                    task.priority === 'high' ? 'bg-orange-400' :
                    task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <span className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-white/30' : 'text-white/80'}`}>
                    {task.title}
                  </span>
                  <span className="badge text-[10px]">{task.status}</span>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'notes' && (
          <div className="flex-center flex-col gap-3 py-12 text-center">
            <Edit3 size={32} className="text-white/10" />
            <p className="text-white/30 text-sm">Notes coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', color: PROJECT_COLORS[0], status: 'active' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list();
      setProjects(data.projects || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data = await projectsApi.create(form);
      setProjects(prev => [data.project, ...prev]);
      setForm({ title: '', description: '', color: PROJECT_COLORS[0], status: 'active' });
      setShowCreate(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await projectsApi.delete(id);
    setProjects(prev => prev.filter(p => p._id !== id));
    if (selectedProject?._id === id) setSelectedProject(null);
  };

  const handleUpdate = (updated) => {
    setProjects(prev => prev.map(p => p._id === updated._id ? updated : p));
    setSelectedProject(updated);
  };

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className={`${selectedProject ? 'hidden lg:flex' : 'flex'} flex-col flex-1 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h1 className="text-white font-display font-bold text-xl">Projects</h1>
            <p className="text-white/35 text-xs mt-0.5">Your dedicated workspaces</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus size={15} /> New Project
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mx-6 mt-4 glass-card p-5 animate-slide-down">
            <h3 className="text-white font-semibold text-sm mb-4">New Project</h3>
            <div className="space-y-3">
              <input
                className="input-nexora"
                placeholder="Project name..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <textarea
                className="textarea-nexora"
                rows={2}
                placeholder="What are you building? (optional)"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">Color:</span>
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={saving || !form.title.trim()} className="btn-primary text-sm flex-1">
                  {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Project
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm"><X size={14} /></button>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 shimmer rounded-2xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex-center flex-col gap-4 py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex-center">
                <FolderOpen size={28} className="text-white/20" />
              </div>
              <div>
                <p className="text-white/50 font-medium">No projects yet</p>
                <p className="text-white/25 text-sm mt-1">Create a project workspace to organize your work</p>
              </div>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={15} /> Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map(p => (
                <ProjectCard
                  key={p._id}
                  project={p}
                  onSelect={setSelectedProject}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workspace panel */}
      {selectedProject && (
        <div className="flex-1 lg:flex-[1.2] border-l border-white/5 bg-surface-1 flex flex-col overflow-hidden animate-slide-up">
          <ProjectWorkspace
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onUpdate={handleUpdate}
          />
        </div>
      )}
    </div>
  );
}
