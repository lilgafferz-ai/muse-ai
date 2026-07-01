import React, { createContext, useContext, useState, useCallback } from 'react';

const NexoraContext = createContext(null);

export function NexoraProvider({ children }) {
  const [activeProject, setActiveProject] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'darker' | 'amoled'
  const [notifications, setNotifications] = useState([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, ...notification }]);
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);

  return (
    <NexoraContext.Provider value={{
      activeProject, setActiveProject,
      devMode, setDevMode,
      theme, setTheme,
      notifications,
      addNotification,
      removeNotification,
      commandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      sidebarCollapsed, setSidebarCollapsed,
    }}>
      {children}
    </NexoraContext.Provider>
  );
}

export function useNexora() {
  const ctx = useContext(NexoraContext);
  if (!ctx) throw new Error('useNexora must be used inside NexoraProvider');
  return ctx;
}
