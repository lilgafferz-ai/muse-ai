const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const searchApi = {
  search: async (query) => {
    if (!query?.trim()) return { chats: [], projects: [], tasks: [], ideas: [], knowledge: [] };
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },
  analytics: async () => {
    const res = await fetch(`${BASE}/analytics`);
    if (!res.ok) throw new Error('Analytics failed');
    return res.json();
  },
};

export default searchApi;
