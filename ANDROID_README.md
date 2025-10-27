# Android App - Quick Start

This branch contains the Android app setup using Capacitor.

## What's New

- ✅ Capacitor installed and configured
- ✅ Android platform added (native Android project)
- ✅ Web assets organized in `www/` folder
- ✅ Android permissions configured
- ✅ npm scripts for easy development
- ✅ Comprehensive setup and deployment guide

## Quick Start

### 1. Install Dependencies (if not already done)

```bash
npm install
```

### 2. Copy Web Files to www/ Folder

```bash
npm run android:copy
```

### 3. Sync to Android Project

```bash
npm run android:sync
```

### 4. Open in Android Studio

```bash
npm run android:open
```

Or manually:
```bash
npx cap open android
```

### 5. Build and Run

In Android Studio:
1. Wait for Gradle sync to complete
2. Click the green "Run" button
3. Select a device (emulator or physical device)
4. The app will launch

## Project Structure

```
.
├── capacitor.config.json          # Capacitor config (points to Railway server)
├── www/                            # Web assets (gitignored - generated)
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── auth0-spa-js.js
├── android/                        # Android native project (gitignored)
│   └── app/
│       └── src/
│           └── main/
│               ├── AndroidManifest.xml
│               └── java/com/tictactoe/multiplayer/
├── resources/                      # App assets
│   └── ICON_GUIDE.md              # Guide for creating app icons
├── ANDROID_SETUP.md               # Complete setup & deployment guide
└── ANDROID_README.md              # This file
```

## Important Files Modified

### New Files
- `capacitor.config.json` - Capacitor configuration
- `ANDROID_SETUP.md` - Complete deployment guide
- `resources/ICON_GUIDE.md` - Icon creation guide

### Modified Files
- `package.json` - Added android scripts
- `.gitignore` - Added android/ and www/ folders

### Generated (not in Git)
- `www/` - Web asset copy for Capacitor
- `android/` - Native Android project

## How It Works

1. **Web Files**: Your existing HTML/CSS/JS files are the source
2. **www/ Folder**: Files are copied here for Capacitor to consume
3. **Android Project**: Capacitor generates a native Android app that loads your web files in a WebView
4. **Server Connection**: The app connects to your Railway server URL (configured in `capacitor.config.json`)

## Making Changes

When you update HTML, CSS, or JS files:

```bash
# 1. Copy files to www/
npm run android:copy

# 2. Sync to Android
npx cap sync android

# 3. Rebuild in Android Studio (or it will auto-reload)
```

Or use the combined command:
```bash
npm run android:sync
```

## Testing

### On Emulator
1. Open Android Studio
2. AVD Manager → Create Virtual Device
3. Run the app on the emulator

### On Physical Device
1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect via USB
4. Select your device in Android Studio
5. Run the app

## Publishing to Google Play Store

See the complete guide in `ANDROID_SETUP.md` for:
- Creating app icons
- Generating signing keys
- Building release APK/AAB
- Google Play Console setup
- Submission process

## Key Configuration

### Server URL
The app connects to: `https://tictactoe-production-5ab6.up.railway.app`

To change this, edit `capacitor.config.json`:
```json
{
  "server": {
    "url": "YOUR_NEW_SERVER_URL"
  }
}
```

### App ID
- Package name: `com.tictactoe.multiplayer`
- App name: `Tic Tac Toe`

To change these, edit `capacitor.config.json` and `android/app/build.gradle`

## Troubleshooting

### Can't connect to server
- Check that Railway server is running
- Verify URL in `capacitor.config.json`
- Check Android manifest has INTERNET permission

### Build errors
- Run `npx cap sync android`
- Clean and rebuild in Android Studio
- Check that JDK 17 is installed

### Changes not showing
- Run `npm run android:sync`
- Rebuild the app in Android Studio
- Clear app data on device

## Next Steps

1. ✅ Android setup complete
2. 🎨 Create custom app icons (see `resources/ICON_GUIDE.md`)
3. 📱 Test on a physical Android device
4. 🔑 Generate signing key for release
5. 📦 Build release AAB
6. 🚀 Submit to Google Play Store

For detailed instructions, see `ANDROID_SETUP.md`.

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/)
- [Google Play Console](https://play.google.com/console)
