import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, Loader, Sparkles } from 'lucide-react';
import api from '../../services/api';

const TRAIT_CONFIG = {
  wit: { label: 'Wit', description: 'Sharpness and humor' },
  sarcasm: { label: 'Sarcasm', description: 'Sarcastic edge' },
  empathy: { label: 'Empathy', description: 'Emotional understanding' },
  playfulness: { label: 'Playfulness', description: 'Fun and energy' },
  formality: { label: 'Formality', description: 'How proper or casual' },
  warmth: { label: 'Warmth', description: 'How affectionate' },
};

const STYLE_OPTIONS = [
  { value: 'playful', label: 'Playful', emoji: '😏' },
  { value: 'direct', label: 'Direct', emoji: '🎯' },
  { value: 'supportive', label: 'Supportive', emoji: '💪' },
  { value: 'sarcastic', label: 'Sarcastic', emoji: '😈' },
  { value: 'philosophical', label: 'Philosophical', emoji: '🤔' },
];

export default function PersonalitySettings() {
  const [personality, setPersonality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPersonality();
  }, []);

  const loadPersonality = async () => {
    setLoading(true);
    try {
      const data = await api.personality.get();
      setPersonality(data);
    } catch (err) {
      console.error('Failed to load personality:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTraitChange = (trait, value) => {
    setPersonality(prev => ({
      ...prev,
      traits: { ...prev.traits, [trait]: parseInt(value) }
    }));
  };

  const handleStyleChange = (style) => {
    setPersonality(prev => ({
      ...prev,
      communicationStyle: style
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.personality.update({
        traits: personality.traits,
        communicationStyle: personality.communicationStyle
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await api.personality.reset();
      await loadPersonality();
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader size={24} className="text-muse-400 animate-spin" />
      </div>
    );
  }

  if (!personality) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-muse-500 to-muse-700 
                        flex items-center justify-center shadow-lg shadow-muse-500/20">
            <Sliders size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white">Personality</h2>
            <p className="text-[11px] text-white/40">Nexora's personality traits</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Communication Style */}
        <div>
          <h3 className="text-sm font-medium text-white/60 mb-3 uppercase tracking-wider">
            Communication Style
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map(style => (
              <button
                key={style.value}
                onClick={() => handleStyleChange(style.value)}
                className={`p-3 rounded-xl text-left transition-all duration-200 ${
                  personality.communicationStyle === style.value
                    ? 'bg-muse-500/20 border border-muse-500/40 shadow-lg shadow-muse-500/10'
                    : 'glass-card border border-transparent hover:border-white/10'
                }`}
              >
                <span className="text-lg">{style.emoji}</span>
                <p className={`text-sm font-medium mt-1 ${
                  personality.communicationStyle === style.value ? 'text-muse-300' : 'text-white/70'
                }`}>
                  {style.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Personality Traits */}
        <div>
          <h3 className="text-sm font-medium text-white/60 mb-3 uppercase tracking-wider">
            Trait Levels
          </h3>
          <div className="space-y-4">
            {Object.entries(TRAIT_CONFIG).map(([key, config]) => {
              const value = personality.traits?.[key] || 5;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-white/70">{config.label}</label>
                    <span className="text-xs text-muse-400 font-mono">{value}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={value}
                    onChange={(e) => handleTraitChange(key, e.target.value)}
                    className="w-full h-1.5 bg-deep-800 rounded-full appearance-none cursor-pointer
                             accent-muse-500 [&::-webkit-slider-thumb]:appearance-none 
                             [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                             [&::-webkit-slider-thumb]:rounded-full 
                             [&::-webkit-slider-thumb]:bg-muse-500 
                             [&::-webkit-slider-thumb]:shadow-lg 
                             [&::-webkit-slider-thumb]:shadow-muse-500/40
                             [&::-webkit-slider-thumb]:transition-transform
                             [&::-webkit-slider-thumb]:hover:scale-125"
                  />
                  <p className="text-[10px] text-white/20 mt-0.5">{config.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-white/5 p-4 flex gap-2">
        <button
          onClick={handleReset}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader size={16} className="animate-spin" />
          ) : saved ? (
            <Sparkles size={16} />
          ) : null}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
