import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';

export function useMemories() {
  const [memories, setMemories] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.memory.getAll();
      setMemories(data.all || []);
      setGrouped(data.grouped || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.memory.getStats();
      setStats(data);
    } catch {
      // Silently fail for stats
    }
  }, []);

  const deleteMemory = useCallback(async (id) => {
    try {
      await api.memory.delete(id);
      setMemories(prev => prev.filter(m => m._id !== id));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchMemories();
    fetchStats();
  }, [fetchMemories, fetchStats]);

  return {
    memories,
    grouped,
    stats,
    loading,
    error,
    fetchMemories,
    deleteMemory,
  };
}
