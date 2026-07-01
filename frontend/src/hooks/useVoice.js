import { useState, useCallback, useRef, useEffect } from 'react';

const RECOGNITION_LANG = 'en-US';

// Speech-to-text often mis-hears "Nex" as "next", "necks", "nix", "nexus"…
// so we accept those variants — she reliably catches her name when called.
const NAME_TOKENS = [
  'nex', 'next', 'necks', 'nix', 'knicks', 'nexus', 'nexis',
  'nexa', 'nexo', 'nexora', 'nexorah', 'nexi', 'nexen', 'nexon', 'nexs',
];
const WAKE_PHRASES = ['hey nex', 'yo nex', 'okay nex', 'ok nex', 'hey nexora', 'hey next', 'hey necks'];

/** True if the transcript looks like Red said "Nex" / "Nexora". */
function containsName(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  if (WAKE_PHRASES.some(p => t.includes(p))) return true;
  const words = t.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  return words.some(w => NAME_TOKENS.includes(w) || w.startsWith('nexor'));
}

/** Strip leading name/wake tokens so only the actual command remains. */
function stripName(text) {
  if (!text) return '';
  let t = text.toLowerCase().replace(/[^a-z0-9\s']/g, ' ');
  for (const p of WAKE_PHRASES) t = t.split(p).join(' ');
  const words = t.split(/\s+/).filter(w => w && !NAME_TOKENS.includes(w) && !w.startsWith('nexor'));
  return words.join(' ').trim();
}

// Female voices that actually sound human, best first. The Edge neural
// "Natural" voices (Aria/Jenny/etc.) are the most human-sounding — and free.
const FEMALE_VOICE_PRIORITY = [
  // Microsoft Edge neural "Natural" voices — most human, free
  'Aria', 'Jenny', 'Michelle', 'Ana', 'Sara', 'Nancy', 'Jane',
  'Sonia', 'Libby', 'Maisie',
  // Apple
  'Samantha', 'Ava', 'Allison', 'Serena', 'Zoe', 'Karen', 'Moira', 'Tessa',
  // Google (Chrome)
  'Google UK English Female', 'Google US English',
  // Windows classic (robotic fallback)
  'Zira',
];

const MALE_HINT = /\bmale\b|david|mark|george|daniel|fred|alex|guy|paul|james|william|ryan|thomas/i;

/**
 * Pick the most human-sounding female English voice available.
 * Prefers neural/"Natural" voices, then known-good names, then any female voice.
 */
function pickFemaleVoice(voices) {
  if (!voices || voices.length === 0) return null;
  const en = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  const base = en.length ? en : voices;
  const search = base.filter(v => !MALE_HINT.test(v.name));
  const pool = search.length ? search : base;

  // 1) Neural / "Natural" female voices — these sound genuinely human
  const neural = pool.filter(v => /natural|neural|online|premium|enhanced/i.test(v.name));
  for (const name of FEMALE_VOICE_PRIORITY) {
    const hit = neural.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
    if (hit) return hit;
  }
  if (neural.length) return neural[0];

  // 2) Known-good female voices by name (any quality)
  for (const name of FEMALE_VOICE_PRIORITY) {
    const hit = pool.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
    if (hit) return hit;
  }
  // 3) Anything that self-identifies as female, else first non-male voice
  const female = pool.find(v => /female|woman|girl/i.test(v.name));
  return female || pool[0];
}

/**
 * Prepare text for natural speech: voice the emotive cues Red asked for
 * (laugh / giggle / cough / sigh) instead of reading them, then strip any
 * leftover stage directions and emoji so the TTS doesn't literally say
 * "asterisk laughs asterisk".
 */
function cleanForSpeech(text) {
  if (!text) return '';
  let t = String(text);

  // Turn emotion cues wrapped in *...*, (...), or [...] into voiced sounds
  t = t.replace(/[*([][^*)\]]*\b(laugh|giggl|chuckl|cough|ahem|sigh)[a-z]*[^*)\]]*[*)\]]/gi, (_m, root) => {
    const r = root.toLowerCase();
    if (r.startsWith('laugh')) return ' haha ';
    if (r.startsWith('giggl')) return ' hehe ';
    if (r.startsWith('chuckl')) return ' heh ';
    if (r.startsWith('cough') || r === 'ahem') return ' ahem ';
    if (r.startsWith('sigh')) return ' hmm ';
    return ' ';
  });

  // Remove any remaining stage directions
  t = t.replace(/\*[^*]*\*/g, ' ')
       .replace(/\([^)]*\)/g, ' ')
       .replace(/\[[^\]]*\]/g, ' ');

  // Strip emoji / symbols the voice would mispronounce
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2728}]/gu, ' ');

  return t.replace(/\s+/g, ' ').trim();
}

/**
 * useVoice — Voice input (Speech-to-Text) + Voice output (Text-to-Speech)
 * with optional hotword detection ("Hey Nex")
 */
export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [hotwordDetected, setHotwordDetected] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const hotwordModeRef = useRef(false);
  const onCommandRef = useRef(null);
  const isListeningRef = useRef(false);
  const micStreamRef = useRef(null);
  
  // Keep isListeningRef in sync with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      // Chrome/Edge load the voice list asynchronously — warm it up so the
      // best female voice is ready before Nexora's first reply.
      synthRef.current.getVoices();
      synthRef.current.onvoiceschanged = () => { synthRef.current.getVoices(); };
    }
  }, []);

  // Check if SpeechRecognition is supported
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  /**
   * Create and configure speech recognition instance
   */
  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = RECOGNITION_LANG;
    recognition.maxAlternatives = 5;   // more candidates → far better name-catching

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      const finalCandidates = [];

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          // Keep every alternative so we can still catch her name even if the
          // top guess mis-heard it.
          for (let a = 0; a < result.length; a++) finalCandidates.push(result[a].transcript);
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const live = (finalTranscript || interimTranscript).trim();
      if (live) setTranscript(live.toLowerCase());

      // Flash the "heard my name" indicator early, from interim results
      if (!finalTranscript && interimTranscript && containsName(interimTranscript)) {
        setHotwordDetected(true);
      }

      if (!finalTranscript || !onCommandRef.current) return;

      // Did Red call her name? Check ALL alternatives for robustness.
      const named = finalCandidates.find(c => containsName(c));
      if (named) {
        setHotwordDetected(true);
        const command = stripName(named);
        onCommandRef.current(command || 'Hey Nex');   // just her name → she acknowledges
        setTimeout(() => setHotwordDetected(false), 2000);
      } else if (!hotwordModeRef.current) {
        // Open conversation — send whatever was said
        onCommandRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn('[Voice] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Allow microphone in browser settings.');
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // Ignore — will restart
      } else {
        setError(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're still supposed to be listening — use ref to avoid stale closure
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    return recognition;
  }, []); // Empty deps — no longer depends on isListening state

  /**
   * Start listening for voice input
   */
  const startListening = useCallback(async (options = {}) => {
    const { hotwordMode = false, onCommand } = options;

    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    hotwordModeRef.current = hotwordMode;
    if (onCommand) onCommandRef.current = onCommand;

    // Prime a cleaned mic stream (noise suppression, echo cancellation, auto
    // gain) so Nex hears Red clearly. Best-effort — ignore if unavailable.
    if (!micStreamRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch { /* fall back to the default mic */ }
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      setError(`Failed to start voice: ${err.message}`);
    }
  }, [isSupported, createRecognition]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach(t => t.stop()); } catch {}
      micStreamRef.current = null;
    }
    setIsListening(false);
    setHotwordDetected(false);
  }, []);

  /**
   * Speak text using speech synthesis
   */
  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!synthRef.current || !voiceEnabled) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const spoken = cleanForSpeech(text);
      if (!spoken) { resolve(); return; }

      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = RECOGNITION_LANG;
      utterance.volume = 1.0;

      // Nexora speaks with the most human-sounding female voice available.
      const preferredVoice = pickFemaleVoice(synthRef.current.getVoices());
      if (preferredVoice) utterance.voice = preferredVoice;

      // Neural/"Natural" voices already sound human — don't distort them.
      // Older robotic voices get a gentle lift to feel warmer and more feminine.
      const isNeural = preferredVoice &&
        /natural|neural|online|premium|enhanced|google|siri/i.test(preferredVoice.name);
      utterance.rate = isNeural ? 1.0 : 0.96;
      utterance.pitch = isNeural ? 1.03 : 1.15;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };

      synthRef.current.speak(utterance);
    });
  }, [voiceEnabled]);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Toggle voice on/off
   */
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => !prev);
    if (!voiceEnabled) {
      stopSpeaking();
    }
  }, [voiceEnabled, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach(t => t.stop()); } catch {}
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    voiceEnabled,
    hotwordDetected,
    error,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleVoice,
    setOnCommand: (handler) => { onCommandRef.current = handler; },
  };
}
