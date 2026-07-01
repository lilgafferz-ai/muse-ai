import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  PermissionManager,
  MuseBackgroundService,
  MuseWakeWord,
  MuseAPI,
} from './services/MuseService';

// ─── App ────────────────────────────────────────────────────────
export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWakeListening, setIsWakeListening] = useState(false);
  const [isBackgroundRunning, setIsBackgroundRunning] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    initMuse();
  }, []);

  const initMuse = async () => {
    setStatus('Requesting permissions...');
    
    // Step 1: Request all permissions
    const granted = await PermissionManager.requestAll();
    setPermissions(granted);
    
    const hasEssential = granted.microphone || true; // Microphone is essential
    if (!hasEssential) {
      setStatus('Microphone access is required for wake word detection');
      return;
    }

    // Step 2: Initialize wake word detection
    setStatus('Initializing wake word...');
    const wakeWordReady = await MuseWakeWord.init();
    
    if (wakeWordReady) {
      MuseWakeWord.setOnWake((keyword) => {
        // Muse detected! Start listening for command
        setStatus(`"${keyword}" detected! How can I help?`);
        
        // Speak acknowledgment (requires TTS module)
        // In production: Tts.speak("Yes?");
      });
    }

    // Step 3: Start background service
    setStatus('Starting background service...');
    await MuseBackgroundService.start();
    setIsBackgroundRunning(true);

    setIsInitialized(true);
    setStatus(wakeWordReady ? 'Say "Muse" to wake me' : 'Muse is ready');
  };

  const toggleWakeWord = async () => {
    if (isWakeListening) {
      await MuseWakeWord.stop();
      setIsWakeListening(false);
      setStatus('Wake word paused');
    } else {
      await MuseWakeWord.start();
      setIsWakeListening(true);
      setStatus('Listening for "Muse"...');
    }
  };

  // For demo/testing: sends a test message
  const testChat = async () => {
    setStatus('Testing connection...');
    const response = await MuseAPI.chat('Hello Muse, are you there?');
    Alert.alert('Muse says', response);
    setStatus(isWakeListening ? 'Listening...' : 'Ready');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={styles.title}>Muse</Text>
        <Text style={styles.subtitle}>AI Companion</Text>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, isInitialized ? styles.active : styles.inactive]} />
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* Wake Word Toggle */}
      <TouchableOpacity
        style={[styles.wakeButton, isWakeListening ? styles.wakeActive : styles.wakeInactive]}
        onPress={toggleWakeWord}
        disabled={!isInitialized}
      >
        <Text style={styles.wakeEmoji}>{isWakeListening ? '🎤' : '😴'}</Text>
        <Text style={styles.wakeLabel}>
          {isWakeListening ? 'Listening...' : 'Tap to wake'}
        </Text>
      </TouchableOpacity>

      {/* Test Chat Button */}
      <TouchableOpacity style={styles.chatButton} onPress={testChat}>
        <Text style={styles.chatButtonText}>Test Chat</Text>
      </TouchableOpacity>

      {/* Permissions Status */}
      <View style={styles.permissionsContainer}>
        <Text style={styles.permissionsTitle}>Permissions</Text>
        {Object.entries(permissions).map(([key, granted]) => (
          <View key={key} style={styles.permissionRow}>
            <Text style={styles.permissionName}>{key}</Text>
            <Text style={[styles.permissionStatus, granted ? styles.granted : styles.denied]}>
              {granted ? '✅' : '❌'}
            </Text>
          </View>
        ))}
      </View>

      {/* Loading */}
      {!isInitialized && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isBackgroundRunning ? '🟢 Background service active' : '⚫ Background service off'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a1a',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#a78bfa',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  active: {
    backgroundColor: '#22c55e',
  },
  inactive: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  wakeButton: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 2,
  },
  wakeActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: '#7c3aed',
  },
  wakeInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  wakeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  wakeLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  chatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionsContainer: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  permissionsTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  permissionName: {
    color: '#d1d5db',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  permissionStatus: {
    fontSize: 14,
  },
  granted: {
    color: '#22c55e',
  },
  denied: {
    color: '#ef4444',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 10, 26, 0.9)',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  footerText: {
    color: '#6b7280',
    fontSize: 12,
  },
});
