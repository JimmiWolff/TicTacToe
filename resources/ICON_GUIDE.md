# App Icon and Splash Screen Guide

## Required Assets

For publishing to Google Play Store, you'll need to generate app icons and splash screens.

### Icon Requirements

**Android Icon Sizes:**
- `icon.png` - 1024x1024px (base icon for generation)
- App launcher icons will be generated automatically by Android Studio

### How to Create Icons

1. **Design your icon:**
   - Create a 1024x1024px PNG image
   - Use simple, recognizable graphics (e.g., X and O for Tic Tac Toe)
   - Ensure good contrast and visibility
   - Follow Material Design guidelines

2. **Tools you can use:**
   - Canva (free, easy to use)
   - Figma (free, professional)
   - GIMP (free, open-source)
   - Photoshop (paid)

3. **Generate adaptive icons:**
   - Use Android Studio's Image Asset Studio (Tools > Resource Manager > + > Image Asset)
   - Or use online generators like:
     - https://icon.kitchen/
     - https://appicon.co/

### Splash Screen (Optional)

Capacitor handles splash screens automatically. To customize:

1. Create `splash.png` (2732x2732px)
2. Place in `resources/` folder
3. Run: `npx capacitor-assets generate`

## Quick Setup with Icon Kitchen

1. Go to https://icon.kitchen/
2. Upload your 1024x1024px icon
3. Select "Android" platform
4. Download the generated resources
5. Replace the icons in `android/app/src/main/res/` folders

## Current Default Icons

The app currently uses Capacitor's default icons. You should replace these before publishing to Google Play Store.
