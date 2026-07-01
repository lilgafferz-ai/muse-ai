/**
 * Muse Mobile Core Service
 * 
 * This is the heart of the Muse mobile experience.
 * It manages:
 * - Background persistent service (always listening)
 * - Wake word detection via Porcupine
 * - Device permissions (camera, SMS, phone, microphone)
 * - Communication with the Muse backend API
 * 
 * To fully implement this, you'll need:
 * 1. npm install all dependencies
 * 2. Get a Picovoice AccessKey from https://console.picovoice.ai/
 * 3. Generate a custom "Muse" .ppn file from the Picovoice Console
 * 4. Place the .ppn file in android/app/src/main/assets/
 * 5. Configure Android permissions in AndroidManifest.xml
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';

const MUSE_API_URL = 'http://10.0.2.2:3001/api'; // Android emulator -> localhost

// ─── Configuration ──────────────────────────────────────────────
const CONFIG = {
  // Get from https://console.picovoice.ai/ (free tier)
  PICOVOICE_ACCESS_KEY: '', 
  // Custom wake word file (generate at console.picovoice.ai)
  WAKE_WORD_PATH: 'muse.ppn',
  // Backend API URL (change to your server IP)
  API_URL: MUSE_API_URL,
};

// ─── Permission Manager ─────────────────────────────────────────
export class PermissionManager {
  /**
   * Request all required permissions at once
   */
  static async requestAll(): Promise<Record<string, boolean>> {
    const permissions = {
      camera: await this.requestCamera(),
      microphone: await this.requestMicrophone(),
      sms: await this.requestSMS(),
      phone: await this.requestPhone(),
      notifications: await this.requestNotifications(),
      storage: await this.requestStorage(),
    };
    return permissions;
  }

  static async requestCamera(): Promise<boolean> {
    try {
      const result = await request(
        Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA
      );
      return result === RESULTS.GRANTED;
    } catch { return false; }
  }

  static async requestMicrophone(): Promise<boolean> {
    try {
      const result = await request(
        Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO
      );
      return result === RESULTS.GRANTED;
    } catch { return false; }
  }

  static async requestSMS(): Promise<boolean> {
    try {
      const result = await request(PERMISSIONS.ANDROID.SEND_SMS);
      if (result === RESULTS.GRANTED) {
        await request(PERMISSIONS.ANDROID.READ_SMS);
      }
      return result === RESULTS.GRANTED;
    } catch { return false; }
  }

  static async requestPhone(): Promise<boolean> {
    try {
      const result = await request(PERMISSIONS.ANDROID.CALL_PHONE);
      return result === RESULTS.GRANTED;
    } catch { return false; }
  }

  static async requestNotifications(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const result = await request(PERMISSIONS.ANDROID.POST_NOTIFICATIONS);
        return result === RESULTS.GRANTED;
      } catch { return false; }
    }
    return true; // Not needed on older Android
  }

  static async requestStorage(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      // Android 13+ uses granular media permissions instead
      return true;
    }
    try {
      const result = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
      return result === RESULTS.GRANTED;
    } catch { return false; }
  }

  /**
   * Open app settings if permission was denied permanently
   */
  static openSettings() {
    openSettings().catch(() => {});
  }
}

// ─── Background Service ─────────────────────────────────────────
export class MuseBackgroundService {
  private static isRunning = false;

  /**
   * The background task — runs as a foreground service with persistent notification
   * Keeps Muse "alive" listening for the wake word
   */
  private static backgroundTask = async (taskData: any) => {
    const { notify } = require('react-native-push-notification');
    
    // Continuous loop — Muse stays alive here
    while (BackgroundService.isRunning()) {
      // ─── Wake word detection loop ───────────────────────────
      // In production, this would use Porcupine's always-listening mode
      // For now, we simulate the background heartbeat
      
      // Ping the backend to stay connected
      try {
        await fetch(`${CONFIG.API_URL}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // Backend might be offline — that's ok, Muse runs locally
      }

      // Sleep to save battery (check every 30 seconds for wake word)
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  };

  /**
   * Start the background service — Muse is now "always listening"
   */
  static async start() {
    if (this.isRunning) return;
    
    await BackgroundService.start(this.backgroundTask, {
      taskTitle: 'Muse',
      taskDesc: 'Always listening — say "Muse" to wake me',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#7c3aed',
      linkingURI: 'muse://',
      parameters: {
        delay: 1000,
      },
      // Required for Android 12+ foreground service
      foregroundServiceType: ['dataSync', 'microphone'],
      progressBar: {
        max: 100,
        value: 0,
        indeterminate: true,
      },
    });
    
    this.isRunning = true;
  }

  /**
   * Stop the background service
   */
  static async stop() {
    if (!this.isRunning) return;
    await BackgroundService.stop();
    this.isRunning = false;
  }

  static getRunning(): boolean {
    return this.isRunning;
  }
}

// ─── Wake Word Detection ────────────────────────────────────────
export class MuseWakeWord {
  private static porcupine: any = null;
  private static isListening = false;
  private static onWakeCallback: ((keyword: string) => void) | null = null;

  /**
   * Initialize Porcupine wake word detection
   * Requires: Picovoice AccessKey + custom .ppn file
   */
  static async init(accessKey: string = CONFIG.PICOVOICE_ACCESS_KEY) {
    if (!accessKey) {
      console.warn('[Muse] No Picovoice AccessKey configured. Wake word disabled.');
      return false;
    }

    try {
      const { PorcupineManager } = require('@picovoice/porcupine-react-native');
      
      const keyword = {
        label: 'Muse',
        publicPath: CONFIG.WAKE_WORD_PATH, // .ppn file in android/app/src/main/assets/
        sensitivity: 0.5,
      };

      this.porcupine = await PorcupineManager.fromKeywords(
        accessKey,
        [keyword],
        (keywordIndex: number) => {
          console.log('[Muse] Wake word detected!');
          if (this.onWakeCallback) {
            this.onWakeCallback('Muse');
          }
        }
      );

      return true;
    } catch (error) {
      console.error('[Muse] Wake word init failed:', error);
      return false;
    }
  }

  /**
   * Start listening for the wake word
   */
  static async start() {
    if (!this.porcupine || this.isListening) return;
    
    try {
      await this.porcupine.start();
      this.isListening = true;
      console.log('[Muse] Wake word listening started');
    } catch (error) {
      console.error('[Muse] Failed to start listening:', error);
    }
  }

  /**
   * Stop listening
   */
  static async stop() {
    if (!this.porcupine || !this.isListening) return;
    
    try {
      await this.porcupine.stop();
      this.isListening = false;
    } catch (error) {
      console.error('[Muse] Failed to stop listening:', error);
    }
  }

  static setOnWake(callback: (keyword: string) => void) {
    this.onWakeCallback = callback;
  }

  static release() {
    if (this.porcupine) {
      this.porcupine.release();
      this.porcupine = null;
    }
    this.isListening = false;
  }
}

// ─── SMS Manager ────────────────────────────────────────────────
export class MuseSMS {
  /**
   * Send an SMS message
   * Requires: SEND_SMS permission
   */
  static async send(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // In production, use react-native-sms or a native module
      const Sms = require('react-native-sms').default;
      await Sms.send({
        body: message,
        recipients: [phoneNumber],
        successTypes: ['sent', 'queued'],
      });
      return true;
    } catch (error) {
      console.error('[Muse] SMS send failed:', error);
      return false;
    }
  }

  /**
   * Read recent SMS messages
   * Requires: READ_SMS permission
   */
  static async readRecent(count: number = 10): Promise<any[]> {
    // In production, this requires a native Android module
    // that reads from the SMS content provider
    console.log('[Muse] SMS reading requires native module');
    return [];
  }
}

// ─── Camera Manager ─────────────────────────────────────────────
export class MuseCamera {
  /**
   * Take a photo
   * Requires: CAMERA permission
   */
  static async takePhoto(): Promise<string | null> {
    // In production, use react-native-image-picker or a camera module
    console.log('[Muse] Camera requires camera module');
    return null;
  }

  /**
   * Save a photo to gallery
   */
  static async savePhoto(uri: string): Promise<boolean> {
    console.log('[Muse] Photo save requires native module');
    return false;
  }

  /**
   * Delete a photo
   */
  static async deletePhoto(uri: string): Promise<boolean> {
    console.log('[Muse] Photo delete requires native module');
    return false;
  }
}

// ─── Alarms ─────────────────────────────────────────────────────
export class MuseAlarms {
  /**
   * Set an alarm
   * Uses Android AlarmManager via native module
   */
  static async setAlarm(hour: number, minute: number, label: string = 'Muse Alarm'): Promise<boolean> {
    try {
      // In production, use react-native-push-notification to schedule
      const PushNotification = require('react-native-push-notification');
      const now = new Date();
      const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
      
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1); // Tomorrow
      }

      PushNotification.localNotificationSchedule({
        title: 'Muse Alarm',
        message: label,
        date: alarmTime,
        allowWhileIdle: true,
        importance: 'high',
        priority: 'high',
        playSound: true,
        soundName: 'default',
      });

      return true;
    } catch (error) {
      console.error('[Muse] Alarm set failed:', error);
      return false;
    }
  }
}

// ─── API Service ─────────────────────────────────────────────────
export class MuseAPI {
  private static baseUrl = CONFIG.API_URL;

  static setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * Send a message to Muse's brain (backend)
   */
  static async chat(message: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      return data.response || '...';
    } catch (error) {
      return `Offline: ${error}`;
    }
  }
}

export default {
  PermissionManager,
  MuseBackgroundService,
  MuseWakeWord,
  MuseSMS,
  MuseCamera,
  MuseAlarms,
  MuseAPI,
};
