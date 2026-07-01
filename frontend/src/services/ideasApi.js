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

const ideasApi = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/ideas${qs ? '?' + qs : ''}`);
  },
  create: (data)     => req('POST',   '/ideas', data),
  update: (id, data) => req('PUT',    `/ideas/${id}`, data),
  delete: (id)       => req('DELETE', `/ideas/${id}`),
  pin:    (id)       => req('POST',   `/ideas/${id}/pin`),
  score:  (id)       => req('POST',   `/ideas/${id}/score`),
};

export default ideasApi;
