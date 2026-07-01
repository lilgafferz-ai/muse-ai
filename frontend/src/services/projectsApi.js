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

const projectsApi = {
  list:       ()         => req('GET',    '/projects'),
  get:        (id)       => req('GET',    `/projects/${id}`),
  create:     (data)     => req('POST',   '/projects', data),
  update:     (id, data) => req('PUT',    `/projects/${id}`, data),
  delete:     (id)       => req('DELETE', `/projects/${id}`),
  addGoal:    (id, text) => req('POST',   `/projects/${id}/goals`, { text }),
  toggleGoal: (id, gid)  => req('PUT',    `/projects/${id}/goals/${gid}`),
  context:    (id)       => req('GET',    `/projects/${id}/context`),
};

export default projectsApi;
