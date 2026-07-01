import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import localDB from '../services/localDB';

/**
 * useMemories — Enhanced with local SQLite fallback
 * 
 * Reads from backend when online, falls back to local DB when offline.
 * Also attempts to sync new remote memories to local.
 */
export function useMemories() {
  const [memories, setMemories] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('unknown'); // 'backend' | 'local'

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try backend first
      const data = await api.memory.getAll();
      setMemories(data.all || []);
      setGrouped(data.grouped || {});
      setSource('backend');

      // Also save remote memories to local DB for offline access
      if (localDB.isReady && data.all) {
        for (const mem of data.all.slice(0, 50)) {
          await localDB.saveMemory({
            id: mem._id,
            type: mem.type,
            key: mem.key,
            value: mem.value,
            context: mem.context,
            importance: mem.importance,
          });
        }
      }
    } catch {
      // Backend unavailable — try local DB
      if (localDB.isReady) {
        const localData = localDB.getAllMemories();
        setMemories(localData.all || []);
        setGrouped(localData.grouped || {});
        setSource('local');

        // Also try to get local stats
        try {
          const localStats = localDB.getMemoryStats();
          setStats(localStats);
        } catch {}
      } else {
        setError('No memories available (offline)');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      // Try backend first
      const data = await api.memory.getStats();
      setStats(data);
    } catch {
      // Fallback to local stats
      if (localDB.isReady) {
        try {
          const localStats = localDB.getMemoryStats();
          setStats(localStats);
        } catch {}
      }
    }
  }, []);

  const deleteMemory = useCallback(async (id) => {
    try {
      // Delete from backend (if online)
      try {
        await api.memory.delete(id);
      } catch {
        // Backend unavailable — that's ok
      }

      // Delete from local DB regardless
      if (localDB.isReady) {
        localDB.deleteMemory(id);
      }

      setMemories(prev => prev.filter(m => m._id !== id && m.id !== id));
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
    source,
    fetchMemories,
    deleteMemory,
  };
}
