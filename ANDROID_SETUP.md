# Android App Setup and Deployment Guide

This guide explains how to build and deploy the Tic Tac Toe Android app to Google Play Store.

## Overview

The Android app is built using [Capacitor](https://capacitorjs.com/), which wraps the existing web application into a native Android app. The app connects to your Railway-hosted backend server.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher) - Already installed
2. **Android Studio** - Download from https://developer.android.com/studio
3. **JDK 17** - Usually comes with Android Studio
4. **Google Play Developer Account** - $25 one-time fee (https://play.google.com/console)

## Project Structure

```
.
├── capacitor.config.json    # Capacitor configuration
├── www/                      # Web assets copied here (gitignored)
├── android/                  # Android native project (gitignored)
├── resources/                # App icons and assets
└── ANDROID_SETUP.md         # This file
```

## Initial Setup (Already Done)

The following has already been configured:

- ✅ Capacitor installed and initialized
- ✅ Android platform added
- ✅ Permissions configured (INTERNET, ACCESS_NETWORK_STATE)
- ✅ Server URL configured to point to Railway
- ✅ npm scripts for building and syncing

## Development Workflow

### 1. Sync Web Assets to Android

Whenever you make changes to the web files (HTML, CSS, JS), run:

```bash
npm run android:sync
```

This copies the files to the `www/` folder and syncs them to the Android project.

### 2. Open in Android Studio

```bash
npm run android:open
```

Or manually:
```bash
npx cap open android
```

### 3. Build and Test

In Android Studio:
1. Wait for Gradle sync to complete
2. Select a device (physical device or emulator)
3. Click the "Run" button (green play icon)

## Building for Release

### Step 1: Prepare App Icons

Before releasing, create custom app icons (see `resources/ICON_GUIDE.md`):

1. Create a 1024x1024px icon
2. Use Android Studio's Image Asset Studio or an online generator
3. Replace icons in `android/app/src/main/res/mipmap-*` folders

### Step 2: Update App Information

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.tictactoe.multiplayer"
        versionCode 1          // Increment for each release
        versionName "1.0.0"    // User-facing version
    }
}
```

### Step 3: Generate Signing Key

Create a keystore for signing your app (first time only):

```bash
cd android
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**IMPORTANT:** Save the keystore file and passwords securely! You'll need them for all future updates.

### Step 4: Configure Signing

Create `android/key.properties`:

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=my-key-alias
storeFile=my-release-key.keystore
```

⚠️ **Add `android/key.properties` and `android/*.keystore` to `.gitignore`!**

Edit `android/app/build.gradle` to add signing config:

```gradle
android {
    ...
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("key.properties")
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 5: Build Release APK/AAB

**For Google Play (recommended):**
```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**For direct installation (APK):**
```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

## Publishing to Google Play Store

### 1. Create Google Play Developer Account

1. Go to https://play.google.com/console
2. Pay the $25 registration fee
3. Complete your account profile

### 2. Create a New App

1. Click "Create app"
2. Fill in app details:
   - **Name:** Tic Tac Toe Multiplayer
   - **Language:** Danish (or your preference)
   - **App/Game:** Game
   - **Free/Paid:** Free

### 3. Complete Store Listing

Required information:
- **App name:** Tic Tac Toe Multiplayer
- **Short description:** (max 80 chars)
- **Full description:** (max 4000 chars)
- **Screenshots:** Minimum 2 screenshots (phone)
- **High-res icon:** 512x512 PNG
- **Feature graphic:** 1024x500 (optional but recommended)
- **Category:** Puzzle
- **Content rating:** Complete questionnaire
- **Privacy policy:** URL to your privacy policy

### 4. Set Up Content Rating

Complete the content rating questionnaire. For a simple Tic Tac Toe game, it should be rated for all ages.

### 5. Upload Your App

1. Go to "Release" > "Production"
2. Click "Create new release"
3. Upload the `app-release.aab` file
4. Add release notes
5. Review and roll out

### 6. Review Process

- Google Play review typically takes 1-7 days
- You'll receive email notifications about the review status
- Address any issues if the app is rejected

## Updating the App

When you make changes:

1. Update web files (HTML/CSS/JS)
2. Run `npm run android:sync`
3. Open in Android Studio
4. Increment `versionCode` and `versionName` in `build.gradle`
5. Build new AAB: `./gradlew bundleRelease`
6. Upload to Google Play Console

## Testing Strategies

### Internal Testing
- Upload AAB to internal testing track
- Add testers by email
- Get feedback before public release

### Closed Beta
- Create a closed testing track
- Share test link with beta testers
- Gather feedback and fix issues

### Open Beta
- Release to a limited audience
- Monitor crash reports and reviews
- Fix issues before production release

## Troubleshooting

### Build Errors

**"Android SDK not found":**
- Install Android Studio
- Set ANDROID_HOME environment variable
- Run `npx cap sync android`

**Gradle build fails:**
- Update Gradle: `cd android && ./gradlew wrapper --gradle-version=8.0`
- Sync project in Android Studio

### Connection Issues

**App can't connect to server:**
- Check `capacitor.config.json` server URL
- Ensure Railway app is running
- Check Android manifest permissions

**WebSocket/Socket.IO issues:**
- Verify HTTPS is used (Railway should provide this)
- Check CORS settings on server
- Test Socket.IO connection in browser first

### Auth0 Issues

**Login not working:**
- Add allowed callback URLs in Auth0 dashboard:
  - `capacitor://localhost`
  - `https://YOUR_APP_ID.auth0.com/capacitor/YOUR_APP_ID/callback`
- Update allowed origins in Auth0

## Important Notes

- 🔒 **Never commit keystore files or passwords to Git**
- 📱 **Test on real devices** - Emulators may not show all issues
- 🔄 **Always increment version codes** for updates
- 📊 **Monitor crash reports** in Google Play Console
- 🚀 **Use internal testing** before production releases

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Material Design Guidelines](https://material.io/design)

## Support

For issues specific to this project, check:
- Railway deployment status
- Server logs for backend issues
- Android Studio logcat for mobile issues
- Socket.IO connection in browser DevTools

## Next Steps

1. ✅ Complete the Android setup (Done!)
2. 🎨 Create custom app icons (see `resources/ICON_GUIDE.md`)
3. 📱 Test on physical Android device
4. 🔑 Generate signing key and build release AAB
5. 📝 Prepare Play Store listing materials
6. 🚀 Submit to Google Play Store
