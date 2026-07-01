import { useEffect, useCallback } from 'react';

/**
 * Global keyboard shortcut manager for NEXORA.
 * Registers Cmd/Ctrl+K for command palette and G+<key> combos for navigation.
 */
export function useKeyboardShortcuts({ onNavigate, onOpenCommandPalette, onNewChat }) {
  const handleKeyDown = useCallback((e) => {
    // Ignore if typing in an input/textarea
    const tag = document.activeElement?.tagName;
    const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.contentEditable === 'true';

    // Cmd/Ctrl + K — Command Palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onOpenCommandPalette?.();
      return;
    }

    if (isEditing) return;

    // Escape key handled by individual components
    // G + <key> navigation shortcuts
    if (e.key === 'g' || e.key === 'G') {
      // We track the next key
      const handleNext = (e2) => {
        window.removeEventListener('keydown', handleNext);
        if (e2.key === 'h' || e2.key === 'H') onNavigate?.('home');
        else if (e2.key === 'c' || e2.key === 'C') onNavigate?.('chat');
        else if (e2.key === 'p' || e2.key === 'P') onNavigate?.('projects');
        else if (e2.key === 'l' || e2.key === 'L') onNavigate?.('planner');
        else if (e2.key === 'i' || e2.key === 'I') onNavigate?.('ideas');
        else if (e2.key === 'k' || e2.key === 'K') onNavigate?.('knowledge');
        else if (e2.key === 'd' || e2.key === 'D') onNavigate?.('devmode');
        else if (e2.key === 's' || e2.key === 'S') onNavigate?.('settings');
      };
      window.addEventListener('keydown', handleNext, { once: true });
      return;
    }

    // N — new chat
    if (e.key === 'n' || e.key === 'N') {
      onNewChat?.();
    }
  }, [onNavigate, onOpenCommandPalette, onNewChat]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
