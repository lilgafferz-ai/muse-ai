import React, { useState, useEffect } from 'react';
import {
  MessageCircle, FolderOpen, Lightbulb, Calendar, Zap,
  ArrowRight, TrendingUp, Brain, Star, Clock, CheckCircle2,
  Sparkles, ChevronRight, Target, Activity
} from 'lucide-react';
import searchApi from '../services/searchApi';
import plannerApi from '../services/plannerApi';
import projectsApi from '../services/projectsApi';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Working late', sub: 'The quiet hours belong to you.' };
  if (h < 12) return { text: 'Good morning', sub: 'Let\'s make today count.' };
  if (h < 17) return { text: 'Good afternoon', sub: 'Stay in the zone.' };
  if (h < 21) return { text: 'Good evening', sub: 'Wind down thoughtfully.' };
  return { text: 'Good night', sub: 'Reflect on what you built today.' };
}

function ScoreRing({ score = 0, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#a78bfa' : '#fb923c';

  return (
    <div className="relative flex-center" style={{ width: size, height: size }}>
      <svg className="score-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex-center flex-col">
        <span className="text-lg font-bold text-white">{score}</span>
        <span className="text-[9px] text-white/40 uppercase tracking-wider">score</span>
      </div>
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

export default function HomeView({ onNavigate, onNewChat }) {
  const greeting = getGreeting();
  const [analytics, setAnalytics] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsData, todayData, projectsData] = await Promise.allSettled([
          searchApi.analytics(),
          plannerApi.getToday(),
          projectsApi.list(),
        ]);
        if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value);
        if (todayData.status === 'fulfilled') setTodayTasks((todayData.value.tasks || []).slice(0, 4));
        if (projectsData.status === 'fulfilled') setProjects((projectsData.value.projects || []).slice(0, 4));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const quickActions = [
    { label: 'New Chat', icon: MessageCircle, color: 'from-muse-600 to-muse-500', action: onNewChat, hint: 'N' },
    { label: 'New Project', icon: FolderOpen, color: 'from-blue-600 to-blue-500', action: () => onNavigate('projects'), hint: 'G P' },
    { label: 'Capture Idea', icon: Lightbulb, color: 'from-amber-600 to-amber-500', action: () => onNavigate('ideas'), hint: 'G I' },
    { label: 'Open Planner', icon: Calendar, color: 'from-green-600 to-green-500', action: () => onNavigate('planner'), hint: 'G L' },
  ];

  const stats = analytics ? [
    { label: 'Tasks Done', value: analytics.tasksCompleted ?? 0, sub: 'this week', icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Active Projects', value: analytics.activeProjects ?? 0, sub: 'in progress', icon: FolderOpen, color: 'text-blue-400' },
    { label: 'Ideas Captured', value: analytics.ideasCaptured ?? 0, sub: 'this week', icon: Lightbulb, color: 'text-amber-400' },
    { label: 'Chats', value: analytics.chatSessions ?? 0, sub: 'this week', icon: MessageCircle, color: 'text-muse-400' },
  ] : null;

  return (
    <div className="view-container">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1 animate-slide-up">
            <p className="text-white/40 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="text-3xl font-display font-bold text-white">{greeting.text},<br /><span className="text-gradient">let's build.</span></h1>
            <p className="text-white/50 text-sm">{greeting.sub}</p>
          </div>

          {/* Productivity score */}
          <div className="glass-card p-4 flex items-center gap-4 animate-slide-up flex-shrink-0" style={{ animationDelay: '0.1s' }}>
            <ScoreRing score={analytics?.productivityScore ?? 0} />
            <div>
              <p className="text-white text-sm font-semibold">Productivity</p>
              <p className="text-white/40 text-xs">Today's score</p>
              <div className="flex items-center gap-1 mt-1">
                <Activity size={10} className="text-muse-400" />
                <span className="text-[10px] text-muse-400">
                  {analytics?.productivityScore >= 70 ? 'On fire 🔥' : analytics?.productivityScore >= 40 ? 'Good pace' : 'Getting started'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────── */}
        <section className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <p className="section-label mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={a.action}
                className="glass-card p-4 flex flex-col items-start gap-3 group text-left hover:scale-[1.02] transition-transform duration-200"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${a.color} flex-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <a.icon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{a.label}</p>
                  <p className="text-white/30 text-[10px] font-mono">{a.hint}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Stats Row ───────────────────────────────────────── */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <p className="section-label mb-3">This Week</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : stats ? (
              stats.map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-xs">{s.label}</span>
                    <s.icon size={14} className={s.color} />
                  </div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-white/30 text-[10px]">{s.sub}</p>
                </div>
              ))
            ) : (
              <div className="col-span-4 text-center text-white/30 text-sm py-4">Connect to backend to see stats</div>
            )}
          </div>
        </section>

        {/* ── Main Content Grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Today's Tasks */}
          <section className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Today's Focus</p>
              <button onClick={() => onNavigate('planner')} className="btn-ghost text-xs gap-1 py-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="glass-card p-4 space-y-2 min-h-[160px]">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)
              ) : todayTasks.length === 0 ? (
                <div className="flex-center flex-col gap-2 py-8 text-center">
                  <Target size={24} className="text-white/15" />
                  <p className="text-white/30 text-sm">No tasks for today</p>
                  <button onClick={() => onNavigate('planner')} className="text-muse-400 text-xs hover:text-muse-300 transition-colors">
                    Add a task →
                  </button>
                </div>
              ) : (
                todayTasks.map((task) => (
                  <div key={task._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.priority === 'urgent' ? 'bg-red-400' :
                      task.priority === 'high'   ? 'bg-orange-400' :
                      task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <span className="text-white/80 text-sm flex-1 truncate">{task.title}</span>
                    {task.dueDate && (
                      <span className="text-white/25 text-[10px] flex items-center gap-1 flex-shrink-0">
                        <Clock size={9} />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Active Projects */}
          <section className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Active Projects</p>
              <button onClick={() => onNavigate('projects')} className="btn-ghost text-xs gap-1 py-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="glass-card p-4 space-y-2 min-h-[160px]">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)
              ) : projects.length === 0 ? (
                <div className="flex-center flex-col gap-2 py-8 text-center">
                  <FolderOpen size={24} className="text-white/15" />
                  <p className="text-white/30 text-sm">No projects yet</p>
                  <button onClick={() => onNavigate('projects')} className="text-muse-400 text-xs hover:text-muse-300 transition-colors">
                    Create a project →
                  </button>
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project._id}
                    onClick={() => onNavigate('projects')}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group text-left"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: project.color || '#7c3aed' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm truncate">{project.title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-muse-500 to-muse-400 rounded-full"
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-white/25 text-[10px]">{project.progress || 0}%</span>
                      <ChevronRight size={12} className="text-white/15 group-hover:text-white/40 transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── AI Suggestion Card ──────────────────────────────── */}
        <section className="animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-muse-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muse-600 to-muse-400 flex-center shadow-lg animate-breathe">
                <Sparkles size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm mb-1">NEXORA Insight</p>
                <p className="text-white/55 text-sm leading-relaxed">
                  {projects.length > 0
                    ? `You have ${projects.length} active project${projects.length > 1 ? 's' : ''}. ${todayTasks.length > 0 ? `Focus on "${todayTasks[0]?.title}" first — it's your top priority today.` : 'Add some tasks to today\'s planner to stay focused.'}`
                    : `Start by creating your first project — it gives NEXORA context to help you think, plan, and build more effectively.`}
                </p>
                <button
                  onClick={() => onNavigate('chat')}
                  className="mt-3 text-muse-400 text-xs hover:text-muse-300 transition-colors flex items-center gap-1"
                >
                  Ask Nex about your priorities <ArrowRight size={11} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Weekly Activity ─────────────────────────────────── */}
        {analytics?.weeklyActivity && (
          <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <p className="section-label mb-3">Weekly Activity</p>
            <div className="glass-card p-4">
              <div className="flex items-end gap-2 h-16">
                {analytics.weeklyActivity.map((day, i) => {
                  const max = Math.max(...analytics.weeklyActivity.map(d => d.tasksCompleted + d.ideasAdded + d.chats), 1);
                  const total = day.tasksCompleted + day.ideasAdded + day.chats;
                  const height = Math.max((total / max) * 48, 4);
                  const isToday = i === analytics.weeklyActivity.length - 1;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-700 ${isToday ? 'bg-muse-500' : 'bg-white/10'}`}
                        style={{ height }}
                        title={`${day.date}: ${total} activities`}
                      />
                      <span className="text-[9px] text-white/25">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* bottom padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}
