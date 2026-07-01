const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const plannerApi = {
  getTasks:     (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/planner/tasks${qs ? '?' + qs : ''}`);
  },
  createTask:   (data)       => req('POST',   '/planner/tasks', data),
  updateTask:   (id, data)   => req('PUT',    `/planner/tasks/${id}`, data),
  deleteTask:   (id)         => req('DELETE', `/planner/tasks/${id}`),
  completeTask: (id)         => req('POST',   `/planner/tasks/${id}/complete`),
  uncompleteTask: (id)       => req('POST',   `/planner/tasks/${id}/uncomplete`),
  getHabits:    ()           => req('GET',    '/planner/habits'),
  getToday:     ()           => req('GET',    '/planner/today'),
  aiPrioritize: (taskIds)    => req('POST',   '/planner/ai-prioritize', { taskIds }),
};

export default plannerApi;
