import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, CheckCircle2, Circle, Trash2, Timer, Flame,
  RefreshCw, Play, Pause, RotateCcw, X, Edit3,
  Calendar, Flag, Loader, Brain, ChevronRight, Target,
  ZapOff, ChevronDown, AlarmClock
} from 'lucide-react';
import plannerApi from '../services/plannerApi';

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400' },
  high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', dot: 'bg-orange-400' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', dot: 'bg-yellow-400' },
  low:    { label: 'Low',    color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  dot: 'bg-green-400' },
};

// ─── Pomodoro Timer ───────────────────────────────────────────────────────────

function PomodoroTimer() {
  const WORK = 25 * 60;
  const BREAK = 5 * 60;
  const [seconds, setSeconds] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const circumference = 2 * Math.PI * 40;
  const total = isBreak ? BREAK : WORK;
  const offset = circumference - (seconds / total) * circumference;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setRunning(false);
            if (!isBreak) { setSessions(n => n + 1); setIsBreak(true); setSeconds(BREAK); }
            else { setIsBreak(false); setSeconds(WORK); }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, isBreak]);

  const reset = () => { setRunning(false); setSeconds(isBreak ? BREAK : WORK); };
  const toggle = () => setRunning(r => !r);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <div className="glass-card p-5 flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full">
        <p className="section-label">Pomodoro</p>
        <span className={`badge ${isBreak ? 'badge-green' : ''} text-[10px]`}>
          {isBreak ? 'Break' : 'Focus'} · {sessions} done
        </span>
      </div>
      <div className="relative w-24 h-24">
        <svg className="pomodoro-ring w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={isBreak ? '#4ade80' : '#8b5cf6'}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex-center flex-col">
          <span className="text-xl font-bold font-mono text-white">{mins}:{secs}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={toggle} className="btn-primary px-4 py-2 text-sm">
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="btn-ghost px-3 py-2"><RotateCcw size={14} /></button>
      </div>
    </div>
  );
}

// ─── Habit Tracker ────────────────────────────────────────────────────────────

function HabitTracker({ habits, onToggle }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const today = new Date().toISOString().split('T')[0];

  if (habits.length === 0) {
    return (
      <div className="glass-card p-5">
        <p className="section-label mb-3">Habits</p>
        <p className="text-white/25 text-sm text-center py-4">No habits yet. Add a task and mark it as habit.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Habits</p>
        <div className="flex gap-1">
          {days.map(d => (
            <div key={d} className="text-[8px] text-white/20 text-center w-[18px]">
              {new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' })}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {habits.map(habit => {
          const doneToday = habit.habitLastDone?.startsWith(today);
          return (
            <div key={habit._id} className="flex items-center gap-3">
              <button
                onClick={() => onToggle(habit)}
                className="flex items-center gap-2 flex-1 text-left group"
              >
                {doneToday
                  ? <CheckCircle2 size={15} className="text-muse-400 flex-shrink-0" />
                  : <Circle size={15} className="text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
                }
                <span className={`text-xs ${doneToday ? 'text-white/50 line-through' : 'text-white/75'}`}>{habit.title}</span>
              </button>
              <div className="flex items-center gap-1">
                {habit.habitStreak > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
                    <Flame size={10} />{habit.habitStreak}
                  </span>
                )}
                <div className="flex gap-0.5">
                  {days.map(d => (
                    <div key={d} className={`habit-cell ${d === today && doneToday ? 'done' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Priority Matrix ──────────────────────────────────────────────────────────

function PriorityMatrix({ tasks }) {
  const quadrants = [
    { key: 'do',     label: 'Do First',  desc: 'Urgent & Important',     tasks: tasks.filter(t => t.priority === 'urgent'), color: 'border-red-500/20 bg-red-500/5' },
    { key: 'plan',   label: 'Plan',      desc: 'Not Urgent & Important',  tasks: tasks.filter(t => t.priority === 'high'),   color: 'border-blue-500/20 bg-blue-500/5' },
    { key: 'delegate',label:'Delegate',  desc: 'Urgent & Not Important',  tasks: tasks.filter(t => t.priority === 'medium'), color: 'border-yellow-500/20 bg-yellow-500/5' },
    { key: 'drop',   label: 'Drop',      desc: 'Not Urgent, Not Important',tasks: tasks.filter(t => t.priority === 'low'),   color: 'border-white/10 bg-white/[0.02]' },
  ];

  return (
    <div className="glass-card p-5">
      <p className="section-label mb-3">Priority Matrix</p>
      <div className="grid grid-cols-2 gap-2">
        {quadrants.map(q => (
          <div key={q.key} className={`matrix-quadrant ${q.color}`}>
            <div className="mb-2">
              <p className="text-white/70 text-xs font-semibold">{q.label}</p>
              <p className="text-white/25 text-[9px]">{q.desc}</p>
            </div>
            <div className="space-y-1">
              {q.tasks.slice(0, 3).map(t => (
                <p key={t._id} className="text-white/50 text-[10px] truncate">· {t.title}</p>
              ))}
              {q.tasks.length === 0 && <p className="text-white/15 text-[10px] italic">empty</p>}
              {q.tasks.length > 3 && <p className="text-white/25 text-[10px]">+{q.tasks.length - 3} more</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({ task, onComplete, onDelete, onUpdate }) {
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const handleSave = async () => {
    await onUpdate(task._id, { title });
    setEditing(false);
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl group transition-all duration-200 ${
      task.status === 'done' ? 'opacity-50' : 'hover:bg-white/[0.03]'
    }`}>
      <button
        onClick={() => onComplete(task)}
        className={`w-5 h-5 rounded-full border-2 flex-center flex-shrink-0 transition-all duration-200 ${
          task.status === 'done'
            ? 'bg-muse-500 border-muse-500'
            : `border-white/20 hover:border-muse-500 ${pc.color}`
        }`}
      >
        {task.status === 'done' && <CheckCircle2 size={12} className="text-white" />}
      </button>

      {editing ? (
        <input
          className="input-nexora flex-1 py-1 text-sm"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-white/30' : 'text-white/80'} cursor-pointer`}
          onClick={() => !task.status === 'done' && setEditing(true)}
        >
          {task.title}
        </span>
      )}

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pc.dot}`} />
        {task.isHabit && <Flame size={12} className="text-orange-400" />}
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-ghost p-1"><Edit3 size={11} /></button>
        )}
        <button onClick={() => onDelete(task._id)} className="btn-ghost p-1 text-red-400/60 hover:text-red-400"><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

// ─── Main Planner View ────────────────────────────────────────────────────────

export default function PlannerView() {
  const [tab, setTab] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', priority: 'medium', isHabit: false, dueDate: '' });
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecs, setAiRecs] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [todayData, habitsData] = await Promise.allSettled([
        plannerApi.getTasks(),
        plannerApi.getHabits(),
      ]);
      if (todayData.status === 'fulfilled') setTasks(todayData.value.tasks || []);
      if (habitsData.status === 'fulfilled') setHabits(habitsData.value.tasks || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    const data = await plannerApi.createTask(form);
    setTasks(prev => [data.task, ...prev]);
    if (form.isHabit) setHabits(prev => [data.task, ...prev]);
    setForm({ title: '', priority: 'medium', isHabit: false, dueDate: '' });
    setShowForm(false);
  };

  const handleComplete = async (task) => {
    if (task.status === 'done') {
      await plannerApi.uncompleteTask(task._id);
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: 'todo' } : t));
    } else {
      await plannerApi.completeTask(task._id);
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: 'done' } : t));
    }
  };

  const handleDelete = async (id) => {
    await plannerApi.deleteTask(id);
    setTasks(prev => prev.filter(t => t._id !== id));
    setHabits(prev => prev.filter(t => t._id !== id));
  };

  const handleUpdate = async (id, data) => {
    await plannerApi.updateTask(id, data);
    setTasks(prev => prev.map(t => t._id === id ? { ...t, ...data } : t));
  };

  const handleHabitToggle = async (habit) => {
    if (habit.status === 'done') {
      await plannerApi.uncompleteTask(habit._id);
      setHabits(prev => prev.map(h => h._id === habit._id ? { ...h, status: 'todo' } : h));
    } else {
      await plannerApi.completeTask(habit._id);
      setHabits(prev => prev.map(h => h._id === habit._id ? { ...h, status: 'done', habitLastDone: new Date().toISOString() } : h));
    }
  };

  const handleAiPrioritize = async () => {
    setAiLoading(true);
    try {
      const ids = tasks.filter(t => t.status !== 'done').map(t => t._id);
      const data = await plannerApi.aiPrioritize(ids);
      setAiRecs(data.recommendations || []);
    } catch {}
    setAiLoading(false);
  };

  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'all',   label: 'All Tasks' },
    { id: 'matrix',label: 'Matrix' },
    { id: 'habits',label: 'Habits' },
  ];

  const displayTasks = tab === 'today'
    ? tasks.filter(t => t.status !== 'done').slice(0, 20)
    : tasks;

  return (
    <div className="view-container">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-white font-display font-bold text-xl">Planner</h1>
            <p className="text-white/35 text-xs mt-0.5">
              {tasks.filter(t => t.status !== 'done').length} tasks remaining · {tasks.filter(t => t.status === 'done').length} done
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAiPrioritize} disabled={aiLoading} className="btn-secondary text-sm">
              {aiLoading ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
              AI Prioritize
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>

        {/* AI Recommendations */}
        {aiRecs.length > 0 && (
          <div className="glass-card p-4 animate-slide-down">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/70 text-sm font-medium flex items-center gap-2">
                <Brain size={14} className="text-muse-400" /> AI Priority Recommendations
              </p>
              <button onClick={() => setAiRecs([])} className="btn-ghost p-1"><X size={12} /></button>
            </div>
            <div className="space-y-2">
              {aiRecs.slice(0, 4).map((rec, i) => (
                <div key={rec.id || i} className="flex gap-3 p-2 rounded-lg bg-white/[0.03]">
                  <span className="text-muse-400 font-bold text-xs w-4 shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-white/80 text-sm">{rec.title}</p>
                    <p className="text-white/35 text-xs mt-0.5">{rec.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Task Form */}
        {showForm && (
          <div className="glass-card p-4 animate-slide-down">
            <div className="space-y-3">
              <input
                className="input-nexora"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <div className="flex gap-3 flex-wrap items-center">
                <select
                  className="input-nexora py-2 w-auto text-sm"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                >
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="input-nexora py-2 w-auto text-sm"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-white/60">
                  <input
                    type="checkbox"
                    checked={form.isHabit}
                    onChange={e => setForm(f => ({ ...f, isHabit: e.target.checked }))}
                    className="accent-muse-500"
                  />
                  <Flame size={13} className="text-orange-400" /> Track as habit
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="btn-primary text-sm flex-1"><Plus size={14} /> Create</button>
                <button onClick={() => setShowForm(false)} className="btn-ghost px-3"><X size={14} /></button>
              </div>
            </div>
          </div>
        )}

        {/* Top Row: Pomodoro */}
        <PomodoroTimer />

        {/* Tabs */}
        <div className="flex border-b border-white/5">
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

        {/* Tab Content */}
        {loading ? (
          <div className="flex-center py-12"><Loader size={20} className="text-white/20 animate-spin" /></div>
        ) : (
          <>
            {(tab === 'today' || tab === 'all') && (
              <div className="glass-card p-2 space-y-1">
                {displayTasks.length === 0 ? (
                  <div className="flex-center flex-col gap-3 py-12 text-center">
                    <Target size={28} className="text-white/10" />
                    <p className="text-white/30 text-sm">No tasks. Add one to get started.</p>
                  </div>
                ) : (
                  displayTasks.map(task => (
                    <TaskItem
                      key={task._id}
                      task={task}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                    />
                  ))
                )}
                {tab === 'all' && tasks.filter(t => t.status === 'done').length > 0 && (
                  <>
                    <div className="divider my-2" />
                    <p className="text-white/20 text-xs px-3 py-1">Completed</p>
                    {tasks.filter(t => t.status === 'done').map(task => (
                      <TaskItem
                        key={task._id}
                        task={task}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
            {tab === 'matrix' && <PriorityMatrix tasks={tasks.filter(t => t.status !== 'done')} />}
            {tab === 'habits' && <HabitTracker habits={habits} onToggle={handleHabitToggle} />}
          </>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
