# Standalone App Deployment Guide (iOS & Android)

This document provides a complete guide for building independent, downloadable standalone apps for **iOS (iPhone)** and **Android** using **EAS (Expo Application Services)**.

Once built using this process, the app runs **100% independently** on mobile devices without requiring a computer running `npx expo start`.

---

## Technical Overview

### 1. Android Standalone (`.apk`)
- Generates a direct installable `.apk` file.
- Any Android phone can download the file, tap Install, and run GuidEM natively.

### 2. iOS Standalone (Ad-Hoc Build)
- Uses **EAS Internal Distribution (Ad-Hoc)**.
- EAS registers your iPhone's unique Device ID (UDID) into a custom provisioning profile.
- Generates a QR code / link to install the app directly on your registered iPhone.

### 3. Over-The-Air (OTA) Updates (`eas update`)
- Once installed on your phone, future code changes (JavaScript/React Native UI fixes) can be pushed instantly over Wi-Fi using `eas update --branch production`.
- Your phone updates automatically without needing to re-build or re-install the app binary!

---

## Step-by-Step Implementation Guide

### Step 1: Update `app.json`
Add native package identifiers to `app.json`:
```json
{
  "expo": {
    "name": "GuidEM",
    "slug": "student-guidance-app",
    "ios": {
      "bundleIdentifier": "com.guidem.app",
      "supportsTablet": true
    },
    "android": {
      "package": "com.guidem.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundColor": "#E6F4FE"
      }
    }
  }
}
```

### Step 2: Create `eas.json` Configuration
Create `eas.json` in the root directory:
```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 3: Global CLI Setup & Device Registration
Run in terminal:
```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Log in to your free Expo account
eas login

# 3. Register your iPhone for direct installation (Ad-Hoc build)
eas device:create
```

### Step 4: Trigger Standalone Builds

#### Build for iPhone (iOS):
```bash
eas build -p ios --profile preview
```

#### Build for Android (.apk):
```bash
eas build -p android --profile preview
```

#### Build for Both Platforms Concurrently:
```bash
eas build --platform all --profile preview
```

---

## Over-The-Air (OTA) Updates

To publish updates to installed phones over Wi-Fi without building a new app binary:
```bash
# Push instant JavaScript/assets update to installed devices
eas update --branch production --message "Fixed questionnaire retake button and profile layout"
```

---

## Verification & Testing Checklist
- [ ] Scan the build QR code / tap the install link on your iPhone.
- [ ] Download the `.apk` on your Android phone and tap Install.
- [ ] Shut down your computer completely (`npx expo start` stopped).
- [ ] Open GuidEM on your phone and verify that navigation, AI guide, and Supabase database calls work smoothly!
