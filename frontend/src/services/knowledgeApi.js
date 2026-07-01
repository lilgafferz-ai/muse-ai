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

const knowledgeApi = {
  list:    (type)        => req('GET',    `/knowledge${type ? '?type=' + type : ''}`),
  graph:   ()            => req('GET',    '/knowledge/graph'),
  create:  (data)        => req('POST',   '/knowledge', data),
  update:  (id, data)    => req('PUT',    `/knowledge/${id}`, data),
  delete:  (id)          => req('DELETE', `/knowledge/${id}`),
  relate:  (id, rel)     => req('POST',   `/knowledge/${id}/relate`, rel),
};

export default knowledgeApi;
