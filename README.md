# Simple Syncing Audiobook

Simple Syncing Audiobook is a multiplatform app that syncs your listening position across devices using Convex.

## Architecture

- **Desktop**: Tauri 2 + Vite + React + shadcn/ui + Tailwind CSS
- **Mobile (Android)**: Expo + React Native + NativeWind + gluestack-ui
- **Backend**: Convex (position sync, audiobook metadata)
- **Shared**: Pure TypeScript sync engine, checksum utility, types

## Project Structure

```
├── convex/           # Convex backend (schema, mutations, queries)
├── packages/shared/  # Shared logic (sync engine, types, checksum)
├── apps/desktop/     # Tauri 2 desktop app
└── apps/mobile/      # Expo React Native app
```

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Rust toolchain (for Tauri desktop)
- Android SDK (for mobile)
- A Convex account and deployment

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Convex

Create a Convex project at https://dashboard.convex.dev, then:

```bash
npx convex dev
```

This will push the schema and functions to your deployment. Note the deployment URL.

### 3. Run the desktop app

```bash
cd apps/desktop
pnpm tauri dev
```

### 4. Run the mobile app

```bash
cd apps/mobile
npx expo prebuild
npx expo run:android
```

## Connection Modes

The app supports two ways to connect:

- **Sign in with Google** — uses a shared hosted Convex deployment with authentication, per-user data isolation, and usage limits (200 audiobooks, 10 devices). No setup required from the user.
- **Bring your own Convex URL** — the user creates their own Convex deployment and pastes the URL. No auth, no limits, full control over their data.

Both options appear on the setup screen. The Google option only shows when `VITE_HOSTED_CONVEX_URL` / `EXPO_PUBLIC_HOSTED_CONVEX_URL` are configured (see below).

## Usage

1. On first launch, sign in with Google **or** enter your own Convex deployment URL
2. Add audiobook folders (desktop) or select a folder / M4B file on mobile to build your library
3. Play audiobooks — your position syncs automatically across all connected devices
4. Works offline — position is saved locally and synced when you're back online

## Sync Behavior

- Local position persists every 2 seconds
- Remote sync every 20 seconds while playing
- Immediate sync on: pause, chapter change, app background, app close
- Offline queue: latest position stored locally, flushed on reconnect
- Manual sync available via the Sync button

## Audiobook Linking

Audiobooks are automatically matched across devices by folder name + file checksum.
If auto-matching fails (different encodings, etc.), you can manually link audiobooks
from the library view.

## Hosted Deployment Setup (Google Sign-In)

To enable the "Sign in with Google" option, you need a **separate** Convex deployment that acts as the shared hosted backend for authenticated users.

### 1. Create the hosted deployment

Create a new Convex project at https://dashboard.convex.dev (separate from your self-hosted dev project).

### 2. Create a hosted env file

Create `.env.hosted` at the repo root:

```
CONVEX_DEPLOYMENT=dev:<your-hosted-deployment-name>
```

### 3. Push functions to it

```bash
npx convex dev --once --env-file .env.hosted
```

### 4. Set up Google OAuth

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (type: **Web application**)
3. Add the redirect URI: `https://<your-hosted-deployment>.convex.site/api/auth/callback/google`
4. Leave Authorized JavaScript origins blank

### 5. Set environment variables on the hosted deployment

In the Convex dashboard for the hosted deployment, add:

| Variable | Value |
|---|---|
| `AUTH_GOOGLE_ID` | Your Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Your Google OAuth client secret |
| `REQUIRE_AUTH` | `true` |

### 6. Set local env vars

In `.env.local` at the repo root:

```
VITE_HOSTED_CONVEX_URL=https://<your-hosted-deployment>.convex.cloud
EXPO_PUBLIC_HOSTED_CONVEX_URL=https://<your-hosted-deployment>.convex.cloud
```

### 7. Keep both deployments in sync

When developing, run `npx convex dev` as usual for your self-hosted deployment. After making backend changes, also push to the hosted deployment:

```bash
npx convex dev --once --env-file .env.hosted
```

## For Maintainers

### Creating a Release

A GitHub Actions workflow automatically builds desktop installers (Windows, macOS, Linux) and the Android APK when a version tag is pushed. To create a release:

```bash
./scripts/bump-version.sh 1.0.0
```

This single command:

1. Updates the version in `package.json`, `apps/desktop/src-tauri/tauri.conf.json`, and `apps/mobile/app.json`
2. Commits the version bump
3. Creates a git tag (`v1.0.0`)
4. Pushes the commit and tag to GitHub

The tag push triggers the release workflow, which builds and uploads:

| Platform | Artifacts |
|---|---|
| Windows | `.msi`, `.exe` (NSIS installer) |
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Linux | `.deb`, `.AppImage`, `.rpm` |
| Android | `.apk` |

Once builds finish, a **draft release** appears on the [Releases page](https://github.com/benjaminlgur/SimpleGlobalAudiobook/releases). Review it, edit the notes if needed, and click **Publish**.

### Deploying the Backend

Deploy to both the self-hosted and hosted production deployments before tagging a release:

```bash
npx convex deploy
npx convex deploy --env-file .env.hosted
```
