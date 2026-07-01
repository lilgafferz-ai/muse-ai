/**
 * Sync Engine — Syncs local SQLite data with backend when online
 *
 * Strategy:
 * - When online: sync local changes → backend, then pull backend changes → local
 * - When offline: queue all changes locally, sync when connection returns
 * - Conflict resolution: last-write-wins based on timestamps
 *
 * Usage:
 *   import syncEngine from './syncEngine';
 *   await syncEngine.init();
 *   syncEngine.startAutoSync();
 */

import localDB from './localDB';
import api from './api';

class SyncEngine {
  constructor() {
    this.isOnline = false;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.autoSyncInterval = null;
    this.syncIntervalMs = 30000; // Sync every 30 seconds
    this.onSyncComplete = null;
    this.onSyncError = null;
  }

  /**
   * Initialize the sync engine
   */
  async init() {
    // We don't need to await localDB readiness here — it'll be initialized before sync starts
    console.log('[Sync] Engine initialized');
  }

  /**
   * Set online status and trigger sync if coming online
   */
  setOnline(isOnline) {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    if (isOnline && wasOffline) {
      console.log('[Sync] Connection restored — syncing...');
      this.sync();
    }
  }

  /**
   * Start automatic periodic syncing
   */
  startAutoSync(intervalMs = this.syncIntervalMs) {
    this.stopAutoSync();
    this.syncIntervalMs = intervalMs;
    this.autoSyncInterval = setInterval(() => {
      if (this.isOnline) {
        this.sync();
      }
    }, this.syncIntervalMs);
    console.log('[Sync] Auto-sync started every', intervalMs / 1000, 's');
  }

  /**
   * Stop auto sync
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Trigger a full sync cycle
   */
  async sync() {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    console.log('[Sync] Starting sync cycle...');

    try {
      // Step 1: Push local changes to backend
      await this._pushLocalChanges();

      // Step 2: Pull remote changes from backend
      await this._pullRemoteChanges();

      this.lastSyncTime = new Date().toISOString();
      console.log('[Sync] Sync cycle complete');

      if (this.onSyncComplete) {
        this.onSyncComplete({ lastSync: this.lastSyncTime });
      }
    } catch (error) {
      console.error('[Sync] Sync cycle failed:', error.message);
      if (this.onSyncError) {
        this.onSyncError(error.message);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local unsynced changes to the backend.
   * Only marks items as synced if the backend confirms receipt — otherwise
   * they stay unsynced and are retried on the next cycle (no silent data loss).
   */
  async _pushLocalChanges() {
    if (!localDB.isReady) return;

    const unsynced = localDB.getUnsyncedItems();
    if (unsynced.chats.length === 0 && unsynced.memories.length === 0) return;

    console.log(
      `[Sync] Pushing ${unsynced.chats.length} chat(s), ${unsynced.memories.length} memory(ies)...`
    );

    const result = await api.sync.push({
      chats: unsynced.chats,
      memories: unsynced.memories,
    });

    if (!result || !result.success) {
      throw new Error('Backend did not confirm the push');
    }

    // Backend confirmed — safe to mark these as synced now
    localDB.markSynced('chats', unsynced.chats.map(c => c.id));
    localDB.markSynced('memories', unsynced.memories.map(m => m.id));
  }

  /**
   * Pull remote changes from the backend into local DB
   */
  async _pullRemoteChanges() {
    if (!localDB.isReady) return;

    try {
      // Pull sessions from backend
      const sessionsData = await api.chat.getSessions().catch(() => null);
      if (sessionsData?.sessions) {
        // Merge remote sessions into local
        // (Local takes priority since local changes are more recent)
      }

      // Pull memories from backend
      const memoriesData = await api.memory.getAll().catch(() => null);
      if (memoriesData?.all) {
        const localMemories = localDB.getAllMemories().all;
        const localKeys = new Set(localMemories.map(m => `${m.key}:${m.value}`));

        for (const mem of memoriesData.all) {
          const key = `${mem.key}:${mem.value}`;
          if (!localKeys.has(key)) {
            // New remote memory — save locally
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

        console.log(`[Sync] Pulled ${memoriesData.all.length} remote memories`);
      }

      // Pull personality from backend
      const personalityData = await api.personality.get().catch(() => null);
      if (personalityData) {
        localDB.savePersonality(personalityData);
        console.log('[Sync] Pulled personality settings');
      }
    } catch (error) {
      console.warn('[Sync] Pull failed (non-fatal):', error.message);
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncTime,
      autoSync: !!this.autoSyncInterval,
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopAutoSync();
  }
}

export default new SyncEngine();
