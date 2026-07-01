import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useWakeWord — Always-listening wake word detection using Porcupine
 * 
 * Detects "Muse" (or configured wake words) and triggers voice commands.
 * Requires a Picovoice AccessKey from https://console.picovoice.ai/
 * 
 * For custom wake words ("Muse"), you need to:
 * 1. Go to https://console.picovoice.ai/
 * 2. Create a custom wake word (e.g., "Muse") → download .ppn file
 * 3. Place the .ppn file in /public/ directory
 * 4. Set the keyword path in PICPOVOICE_KEYWORD_PATH env or default
 * 
 * For built-in wake words, use: 'hey siri', 'ok google', 'hey google', 'alexa', 'computer', 'bumblebee', 'picovoice', 'terminator', 'blueberry', 'grasshopper', 'grapefruit', 'americano'
 */
const BUILT_IN_KEYWORDS = {
  'hey siri': 'Hey Siri',
  'ok google': 'OK Google',
  'hey google': 'Hey Google',
  'computer': 'Computer',
  'picovoice': 'Picovoice',
  'terminator': 'Terminator',
  'alexa': 'Alexa',
};

// AccessKey — users should get their own free key from Picovoice Console
// In Vite, use VITE_PICOVOICE_ACCESS_KEY in your .env file
const ACCESS_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PICOVOICE_ACCESS_KEY) || '';

// ─── IMPORTANT: Wake Word Setup ──────────────────────────────────
// 
// To use "Muse" as the actual wake word:
// 1. Sign up at https://console.picovoice.ai/ (free tier available)
// 2. Create a custom wake word "Muse" → download the .ppn file
// 3. Place the .ppn file in frontend/public/
// 4. Change this constant to use your .ppn file:
//    const CUSTOM_KEYWORD = { 
//      publicPath: '/muse.ppn',
//      label: 'Muse',
//      sensitivity: 0.5 
//    };
//
// Until then, the hook uses 'computer' as a built-in keyword
// (with the label still sent as 'Muse' in the callback)
// ────────────────────────────────────────────────────────────────
const BUILTIN_KEYWORD = 'computer';

export function useWakeWord() {
  const [isReady, setIsReady] = useState(false);
  const [isWakeListening, setIsWakeListening] = useState(false);
  const [lastWakeWord, setLastWakeWord] = useState('');
  const [error, setError] = useState(null);
  const porcupineRef = useRef(null);
  const onWakeRef = useRef(null);
  const initializedRef = useRef(false);
  const listeningRef = useRef(false);

  /**
   * Initialize Porcupine wake word detection
   * Releases any existing worker before creating a new one
   */
  const initWakeWord = useCallback(async () => {
    // Release existing worker if re-initializing
    if (porcupineRef.current) {
      try {
        porcupineRef.current.release();
      } catch {}
      porcupineRef.current = null;
    }

    // If no AccessKey, show a helpful message and return
    if (!ACCESS_KEY) {
      setError('Picovoice AccessKey required. Get a free key at https://console.picovoice.ai/ and set VITE_PICOVOICE_ACCESS_KEY in frontend/.env');
      return false;
    }

    try {
      // Dynamic import to avoid breaking if package is not installed
      const { PorcupineWorker } = await import('@picovoice/porcupine-web');

      // Use a built-in keyword — these work with any valid AccessKey
      // For custom "Muse" keyword: generate a .ppn file at console.picovoice.ai
      const keyword = {
        builtin: BUILTIN_KEYWORD,
        label: 'Nex',
        sensitivity: 0.5
      };

      const porcupine = await PorcupineWorker.create(
        ACCESS_KEY,
        [keyword],
        (detection) => {
          console.log('[WakeWord] Detected:', detection.label);
          setLastWakeWord(detection.label);
          
          // Trigger the wake callback
          if (onWakeRef.current) {
            onWakeRef.current(detection.label);
          }
        }
      );

      porcupineRef.current = porcupine;
      initializedRef.current = true;
      setIsReady(true);
      setError(null);
      console.log('[WakeWord] Porcupine initialized with keyword:', BUILTIN_KEYWORD);
      return true;
    } catch (err) {
      console.error('[WakeWord] Init error:', err.message);
      setError(`Wake word init failed: ${err.message}. Check your AccessKey at https://console.picovoice.ai/`);
      initializedRef.current = false;
      return false;
    }
  }, []);

  /**
   * Start listening for the wake word
   */
  const startWakeListening = useCallback(async () => {
    try {
      if (!porcupineRef.current) {
        const inited = await initWakeWord();
        if (!inited) return;
      }

      const { WebVoiceProcessor } = await import('@picovoice/web-voice-processor');
      await WebVoiceProcessor.subscribe(porcupineRef.current);
      listeningRef.current = true;
      setIsWakeListening(true);
      setError(null);
      console.log('[WakeWord] Now listening for wake word...');
    } catch (err) {
      console.error('[WakeWord] Start error:', err.message);
      setError(`Failed to start wake word detection: ${err.message}`);
    }
  }, [initWakeWord]);

  /**
   * Stop listening for the wake word
   */
  const stopWakeListening = useCallback(async () => {
    try {
      const { WebVoiceProcessor } = await import('@picovoice/web-voice-processor');
      if (porcupineRef.current) {
        await WebVoiceProcessor.unsubscribe(porcupineRef.current);
      }
      listeningRef.current = false;
      setIsWakeListening(false);
      console.log('[WakeWord] Stopped wake word detection');
    } catch (err) {
      console.error('[WakeWord] Stop error:', err.message);
    }
  }, []);

  /**
   * Set a handler for when the wake word is detected
   * The handler receives the wake word label and can start recording voice commands
   */
  const setOnWake = useCallback((handler) => {
    onWakeRef.current = handler;
  }, []);

  /**
   * Release resources on unmount
   */
  useEffect(() => {
    return () => {
      if (porcupineRef.current) {
        try {
          porcupineRef.current.release();
        } catch {}
        porcupineRef.current = null;
      }
    };
  }, []);

  return {
    isReady,
    isWakeListening,
    lastWakeWord,
    error,
    startWakeListening,
    stopWakeListening,
    setOnWake,
    initWakeWord,
  };
}

export default useWakeWord;
