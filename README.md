# Pickem

Pickem is a TypeScript/Node tRPC backend paired with an Expo-managed React Native client. The repo contains everything needed to run the API locally and ship the mobile app to Web, Android, and iOS.

## Prerequisites

- Node.js 18+ and npm (or another package manager) installed globally
- Access to a MySQL database for the Drizzle ORM models in `drizzle/schema.ts`
- Stripe account + secret key if you intend to process payments
- Expo CLI (shipped with `npx expo ...`) and optional `eas-cli` (`npm install -g eas-cli`) for store builds
- Android Studio (emulator) and/or Xcode/iOS Simulator for local device testing

## Repository layout

| Path | Description |
| --- | --- |
| `src/` | tRPC HTTP server, routers, Stripe handlers, shared helpers |
| `drizzle/` | Database schema used by the backend and migrations |
| `mobile/` | Expo app that targets web, Android, and iOS |
| `scripts/` | Utility/automation scripts |

## Environment variables

Create a `.env` file in the repo root (and on any server or CI target) covering at least:

```
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
STRIPE_SECRET_KEY=sk_live_xxx (optional but required if payments are active)
OWNER_OPEN_ID=<Auth0/Identity provider open ID for automatic admin promotion>
PORT=3000 (optional override)
```

> Expo can also read env values via `app.config.js`/`app.json` or Metro config. Mirror any variables your client needs before building.

## Installing dependencies

```bash
npm install            # root server dependencies
cd mobile && npm install
```

## Running the backend locally

```bash
npm run dev            # starts src/server/index.ts at http://localhost:3000
```

The API expects `DATABASE_URL` to point at a reachable MySQL instance. For production builds run `npm run build` followed by `npm start` to serve the compiled `dist/server` output.

## Testing / linting

```bash
npm test               # vitest suite
npm run lint           # type-checks the project
```

---

# Expo application

All client commands run from `mobile/` unless noted otherwise.

```bash
cd mobile
npm start              # generates a QR code and Metro bundler dashboard
```

When Metro is running you can press:

- `w` to open the web build in your default browser
- `a` to launch the Android emulator/device via Expo Go
- `i` to launch the iOS Simulator or run on a USB-connected device

Ensure your backend is reachable from your device (use the machine's LAN IP instead of `localhost` when testing on hardware).

## Web (React Native for Web)

### Local development

```bash
cd mobile
npm run web            # alias for `expo start --web`
```

### Production build & deployment

Expo can emit a static React Native for Web bundle ready for any static hosting provider (Vercel, Netlify, S3 + CloudFront, etc.).

```bash
cd mobile
npx expo export --platform web --output-dir dist/web
```

Upload the generated `mobile/dist/web` directory to your host of choice. Configure rewrites/headers there exactly as you would for any React SPA. Remember to set the same environment variables (via build-time injections) so the web bundle can talk to your deployed API.

## Android

### Local development build

```bash
cd mobile
npm run android        # opens Expo Go in an emulator or connected device
```

Requirements:
- Android Studio installed with a Pixel/ARM emulator, or enable USB debugging on a device.
- `adb` must be discoverable on your PATH.

### Store / production build (EAS Build)

1. Install and log into Expo services if you have not already:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure the project (first run only):
   ```bash
   cd mobile
   eas build:configure
   ```
3. Kick off a production build:
   ```bash
   eas build -p android --profile production
   ```
4. Download the generated `.aab` from the Expo dashboard and upload it to the Google Play Console. Keep the signing keystore Expo creates (or provide your own) for future updates.

## iOS

### Local development build

```bash
cd mobile
npm run ios            # opens the iOS Simulator or prompts for a device
```

Requirements:
- macOS with Xcode + Command Line Tools installed
- An Apple developer account for on-device signing

### App Store build (EAS Build)

1. Ensure you are logged in via `eas login` (see Android steps).
2. Make sure your bundle identifier/capabilities are set in `mobile/app.json` under `expo.ios`.
3. Run a production build:
   ```bash
   cd mobile
   eas build -p ios --profile production
   ```
4. Download the resulting `.ipa` from Expo and either upload it through `Transporter` or run `eas submit -p ios` to ship it straight to App Store Connect.

---

## Deployment checklist

- [ ] Backend deployed (Docker, PM2, serverless, etc.) with `npm run build && npm start`
- [ ] Environment variables supplied to both backend and Expo builds
- [ ] Database migrations applied using your preferred Drizzle workflow
- [ ] Expo project linked to the correct EAS project ID (`app.json > expo.extra.eas.projectId`)
- [ ] Web/Android/iOS artifacts uploaded to their hosting platforms

These steps cover local development through shipping binaries/web bundles across every supported platform. Reach out to your Expo/hosting provider docs for more detailed provisioning guidance.
