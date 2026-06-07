import { useState, useCallback, useRef, useEffect } from 'react';

const HOTWORDS = ['muse', 'hey muse', 'yo muse', 'hey muse', 'ai muse', 'muse ai'];
const RECOGNITION_LANG = 'en-US';

/**
 * useVoice — Voice input (Speech-to-Text) + Voice output (Text-to-Speech)
 * with optional hotword detection ("Hey Muse")
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

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
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
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullText = (finalTranscript || interimTranscript).toLowerCase().trim();
      
      if (fullText) {
        setTranscript(fullText);

        // Hotword detection — check MULTIPLE wake words
        const detectedHotword = HOTWORDS.find(hw => fullText.includes(hw));
        if (detectedHotword) {
          setHotwordDetected(true);
          // Extract command AFTER the hotword
          const command = fullText.replace(detectedHotword, '').trim();
          if (command && onCommandRef.current) {
            onCommandRef.current(detectedHotword, command);
          }
          setTimeout(() => setHotwordDetected(false), 2000);
        } else if (!hotwordModeRef.current && onCommandRef.current && finalTranscript) {
          // Direct command (not hotword mode) — send immediately
          onCommandRef.current(finalTranscript.trim());
        }
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
      // Auto-restart if we're still supposed to be listening
      if (isListening) {
        try {
          recognition.start();
        } catch {}
      }
    };

    return recognition;
  }, [isListening]);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback((options = {}) => {
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

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = RECOGNITION_LANG;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a good voice
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && v.name.includes('Female') || v.name.includes('Google UK')
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
      
      if (preferredVoice) utterance.voice = preferredVoice;

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
