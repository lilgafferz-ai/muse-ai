import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Home, MessageCircle, FolderOpen, Calendar,
  Lightbulb, Network, Terminal, Settings, Plus,
  PlusCircle, Zap, Clock, ChevronRight, Command,
} from "lucide-react";

// ─── Navigation items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",      label: "Home",      icon: Home,         shortcut: "G H" },
  { id: "chat",      label: "Chat",      icon: MessageCircle, shortcut: "G C" },
  { id: "projects",  label: "Projects",  icon: FolderOpen,   shortcut: "G P" },
  { id: "planner",   label: "Planner",   icon: Calendar,     shortcut: "G L" },
  { id: "ideas",     label: "Idea Vault", icon: Lightbulb,   shortcut: "G I" },
  { id: "knowledge", label: "Knowledge", icon: Network,      shortcut: "G K" },
  { id: "devmode",   label: "Dev Mode",  icon: Terminal,     shortcut: "G D" },
  { id: "settings",  label: "Settings",  icon: Settings,     shortcut: "G S" },
];

const ACTION_ITEMS = [
  { id: "__new_chat",    label: "New Chat",       icon: MessageCircle, shortcut: "N C" },
  { id: "__new_project", label: "New Project",    icon: FolderOpen,    shortcut: "N P" },
  { id: "__idea",        label: "Capture Idea",   icon: Lightbulb,     shortcut: "N I" },
];

// ─── ShortcutBadge ────────────────────────────────────────────────────────────
function ShortcutBadge({ keys }) {
  return (
    <span className="flex items-center gap-1">
      {keys.split(" ").map((k, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.35)",
            minWidth: "20px",
          }}
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

// ─── CommandPalette ────────────────────────────────────────────────────────────
export default function CommandPalette({ isOpen, onClose, onNavigate, recentItems = [] }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Register global shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // parent toggles isOpen; if already open just focus input
        if (isOpen && inputRef.current) inputRef.current.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build filtered flat list
  const q = query.toLowerCase().trim();

  const filteredNav = NAV_ITEMS.filter(
    (item) => !q || item.label.toLowerCase().includes(q) || item.id.includes(q)
  );
  const filteredActions = ACTION_ITEMS.filter(
    (item) => !q || item.label.toLowerCase().includes(q)
  );
  const filteredRecent = recentItems.slice(0, 3).filter(
    (item) => !q || item.label?.toLowerCase().includes(q)
  );

  // Flat list for arrow key navigation
  const allItems = [
    ...filteredNav.map((i) => ({ ...i, _section: "nav" })),
    ...filteredActions.map((i) => ({ ...i, _section: "action" })),
    ...filteredRecent.map((i) => ({ ...i, _section: "recent" })),
  ];

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[selectedIndex];
        if (item) handleSelect(item);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, allItems, selectedIndex]); // eslint-disable-line

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (item) => {
      if (item.id.startsWith("__")) {
        // Action items – pass the action id
        onNavigate?.(item.id);
      } else {
        onNavigate?.(item.id);
      }
      onClose();
    },
    [onNavigate, onClose]
  );

  if (!isOpen) return null;

  let flatIdx = 0;

  const renderSection = (label, items, iconOverride) => {
    if (items.length === 0) return null;
    const startIdx = flatIdx;
    flatIdx += items.length;
    return (
      <div key={label}>
        <div className="px-4 py-2">
          <span className="section-label">{label}</span>
        </div>
        {items.map((item, i) => {
          const idx = startIdx + i;
          const Icon = item.icon;
          const isSelected = selectedIndex === idx;
          return (
            <button
              key={item.id}
              data-idx={idx}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-100"
              style={{
                background: isSelected ? "rgba(139,92,246,0.12)" : "transparent",
                borderLeft: isSelected ? "2px solid rgba(139,92,246,0.6)" : "2px solid transparent",
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => handleSelect(item)}
            >
              <div
                className="flex-center w-8 h-8 rounded-lg flex-shrink-0"
                style={{
                  background: isSelected
                    ? "rgba(139,92,246,0.2)"
                    : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Icon
                  size={15}
                  style={{ color: isSelected ? "#a78bfa" : "rgba(255,255,255,0.45)" }}
                />
              </div>
              <span
                className="flex-1 text-sm font-medium"
                style={{ color: isSelected ? "white" : "rgba(255,255,255,0.7)" }}
              >
                {item.label}
              </span>
              {item.shortcut && <ShortcutBadge keys={item.shortcut} />}
              {isSelected && (
                <ChevronRight size={14} style={{ color: "rgba(139,92,246,0.6)" }} />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="command-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="command-panel" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Search size={16} style={{ color: "rgba(139,92,246,0.7)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "rgba(255,255,255,0.9)", caretColor: "#a78bfa" }}
            placeholder="Search or jump to…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1">
            <kbd
              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: "420px" }}>
          {allItems.length === 0 ? (
            <div className="flex-center flex-col gap-2 py-10">
              <Search size={24} style={{ color: "rgba(255,255,255,0.15)" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <>
              {filteredRecent.length > 0 && renderSection("RECENT", filteredRecent)}
              {filteredNav.length > 0 && renderSection("NAVIGATION", filteredNav)}
              {filteredActions.length > 0 && renderSection("ACTIONS", filteredActions)}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-1.5">
            <Command size={10} style={{ color: "rgba(255,255,255,0.2)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Navigate with arrows · Enter to select · Esc to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}