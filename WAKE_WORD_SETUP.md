# 🎙️ Custom "Muse" Wake Word Setup Guide

This guide walks you through setting up the **actual** "Muse" wake word detection using Picovoice Porcupine. Currently, the code uses the built-in "Computer" keyword as a fallback. Follow these steps to make Muse respond specifically to "Muse".

## Step 1: Get a Picovoice AccessKey (Free)

1. Go to **[Picovoice Console](https://console.picovoice.ai/)** 
2. Sign up for a free account (no credit card required)
3. Copy your **AccessKey** from the dashboard
4. Save it to your frontend `.env` file:

```bash
# In frontend/.env (create this file)
VITE_PICOVOICE_ACCESS_KEY=your_access_key_here
```

## Step 2: Create the "Muse" Wake Word Model

1. In the **Picovoice Console**, click **"Create Wake Word"**
2. Type **"Muse"** as the wake word
3. Select **"Web (WASM)"** as the platform
4. Click **"Train"** — this generates your `.ppn` file
5. Download the file (it should be named `Muse_en_wasm_v3_0_0.ppn` or similar)

## Step 3: Add the .ppn File to Your Project

Place the downloaded file in your project:

### For Web (Frontend):
```bash
# Copy the .ppn file to public/
cp ~/Downloads/Muse_en_wasm_v3_0_0.ppn frontend/public/muse.ppn
```

### For Mobile (Android):
```bash
# Copy the .ppn file to Android assets/
cp ~/Downloads/Muse_en_wasm_v3_0_0.ppn muse-mobile/android/app/src/main/assets/muse.ppn
```

### For Desktop (Windows/Mac/Linux):
```bash
# Copy the .ppn file to the Tauri app resources
cp ~/Downloads/Muse_en_wasm_v3_0_0.ppn frontend/src-tauri/resources/muse.ppn
```

## Step 4: Update the Code

### Web (useWakeWord.js):
Edit `frontend/src/hooks/useWakeWord.js` to replace the built-in keyword with your custom `.ppn`:

```javascript
// Change this:
const BUILTIN_KEYWORD = 'computer';

// To this:
const CUSTOM_KEYWORD = {
  publicPath: '/muse.ppn',
  label: 'Muse',
  sensitivity: 0.5
};

// Then in initWakeWord(), change:
const keyword = { builtin: BUILTIN_KEYWORD, label: 'Muse', sensitivity: 0.5 };
// To:
const keyword = CUSTOM_KEYWORD;
```

### Mobile (MuseService.ts):
Edit `muse-mobile/src/services/MuseService.ts`:

```javascript
// The CONFIG.WAKE_WORD_PATH should already point to 'muse.ppn'
// Just ensure the .ppn file is in android/app/src/main/assets/
```

## Step 5: Test It

1. **Web**: Run `npm run dev` in the frontend, click the wake word button (radar icon), and say **"Muse"**
2. **Mobile**: Build the React Native app, grant microphone permission, and say **"Muse"**

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "AccessKey required" error | Make sure `VITE_PICOVOICE_ACCESS_KEY` is set in `frontend/.env` |
| "No such file" error | Check that `muse.ppn` exists in `frontend/public/` |
| Wake word not detecting | Lower the sensitivity value (0.3 = more sensitive, 0.8 = less false positives) |
| Microphone not working | Allow microphone access in browser/app settings |
| Browser blocks mic | Use Chrome or Edge (Firefox has limitations) |

## Built-in Keywords (No .ppn Needed)

For testing without a custom .ppn file, you can use these built-in keywords:
- `computer`, `hey siri`, `ok google`, `hey google`, `alexa`, `picovoice`, `terminator`, `americano`, `blueberry`, `grasshopper`, `grapefruit`, `bumblebee`

## Resources

- [Picovoice Console](https://console.picovoice.ai/) - Generate custom wake words
- [Porcupine Web Docs](https://picovoice.ai/docs/quick-start/porcupine-web/) - Web SDK documentation
- [Porcupine Pricing](https://picovoice.ai/pricing/) - Free tier: 1 custom wake word, unlimited built-in
