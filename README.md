This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Runtime Requirement

Use **Node 20.x** for local development and CI.

```sh
node -v
```

This repo includes `.nvmrc` and `.node-version` set to `20` for version managers.

# Backend + Deployment Runbook

## Firebase Functions: deploy/upload

This app's callable backend lives in `functions/` and deploys to Firebase project `dream-interpretation-1a958` (from `.firebaserc`).

1. Install Firebase CLI and log in (one-time):

```sh
npm install -g firebase-tools
firebase login
```

2. Install function dependencies:

```sh
npm --prefix functions install
```

3. Set required secrets/params (details below), then deploy:

```sh
firebase deploy --only functions --project dream-interpretation-1a958
```

4. Check logs if needed:

```sh
firebase functions:log --project dream-interpretation-1a958
```

You can also deploy from inside `functions/` with:

```sh
npm run deploy
```

## Where vector stores are defined

Vector store params are declared in `functions/index.js` with `defineString(...)`:

- `OPENAI_VECTOR_HINDU_STORE_ID`
- `OPENAI_VECTOR_ISLAMIC_STORE_ID`
- `OPENAI_VECTOR_CHRISTIAN_STORE_ID`
- `OPENAI_VECTOR_SCIENTIFIC_STORE_ID`
- `OPENAI_VECTOR_BUDDHIST_STORE_ID`

They are mapped to interpretation sources in `getVectorStoreId(sourceKey)` in `functions/index.js`.

Per-project values are stored in:

- `functions/.env.dream-interpretation-1a958`

Update that file when vector store IDs change, then redeploy functions.

## OpenAI API key (ChatGPT API key): how to push

The OpenAI key is read as a Firebase Functions **secret** (`OPENAI_API_KEY`) in `functions/index.js` via `defineSecret`.

Set/update it with:

```sh
firebase functions:secrets:set OPENAI_API_KEY --project dream-interpretation-1a958
```

Then redeploy:

```sh
firebase deploy --only functions --project dream-interpretation-1a958
```

Important:

- Do not place `OPENAI_API_KEY` in source files.
- Do not commit secret values to git.

## Android deployment (release)

### 1) Signing setup (one-time)

Generate upload keystore (example):

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties`:

```properties
storeFile=upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

`android/app/build.gradle` reads this file and uses `signingConfigs.release`.

### 2) Build release artifact

From `android/`:

```sh
./gradlew clean bundleRelease
```

Output AAB:

`android/app/build/outputs/bundle/release/app-release.aab`

Optional APK build:

```sh
./gradlew assembleRelease
```

Output APK:

`android/app/build/outputs/apk/release/app-release.apk`

### 3) Publish

Upload the `.aab` to Google Play Console (internal testing / closed / production track).

## Android keys/config locations

- Release signing keystore: `android/app/upload-keystore.jks` (gitignored)
- Keystore passwords/aliases: `android/keystore.properties` (gitignored)
- Firebase Android app config: `android/app/google-services.json`
- RevenueCat Android public SDK key: `src/config/revenuecat.ts`

Note: `android/app/debug.keystore` is only for debug builds.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

# Dependency Notes

- `@react-native-firebase/*/lib/modular` imports are currently used in app code and intentionally left unchanged in this pass.
- These are internal package paths and may break on future package upgrades.
- Follow-up task: migrate those imports to public package entrypoints.
