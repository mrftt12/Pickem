# Pick'em Mobile (Expo)

A lightweight Expo-managed React Native client that surfaces the weekly pick submission flow, pool leaderboard, and player payments for the NFL pick'em pool backend in this repo.

## Getting started

1. Install dependencies inside the `mobile` directory:
   ```bash
   cd mobile
   npm install
   ```
2. Start the Expo dev server:
   ```bash
   npm run start
   ```
3. Use the Expo Go app, an iOS/Android simulator, or `npm run web` to preview the UI.

> **Note:** Assets in `mobile/assets` are placeholders; feel free to drop in real branding before shipping.

## Architecture highlights

- **State hook (`src/hooks/usePickemData.ts`)** – Centralizes mocked pool data and pick state transitions. Swapping the mock fetch with live TRPC/REST calls can be done inside this hook without touching the UI layer.
- **Domain-driven screens** – `WeeklyPicksScreen`, `LeaderboardScreen`, and `ProfileScreen` keep their layouts isolated so that navigation can be swapped to `expo-router` or `react-navigation` later.
- **Stateless components** – Buttons, cards, and pills live under `src/components` and only receive props, which makes it straightforward to port them to the existing web design system or share styling tokens from `src/theme/colors.ts`.

## Wiring to the backend

To connect to the existing tRPC server:

1. Replace the mock exports in `src/data/mockData.ts` with a lightweight client that calls your API (REST or tRPC).
2. Update `usePickemData` to fetch weeks/matchups on mount and to send pick mutations to the backend inside `togglePick`/`Submit Picks`.
3. Gate actions with the `week.isLocked` flag once the backend wires up real lock timestamps.

Because the UI is fully typed (see `src/types/pickem.ts`), TypeScript will highlight any data mismatch when swapping out the mock data for live responses.

## Updating the 2025 schedule mock

The Expo client now reads from `src/data/season2025.json`, which is generated from the CSV under `data/2025_scores.csv`. Regenerate it any time the CSV changes:

```bash
scripts/generate_season_data.py
```

Adjust the script's `--input`/`--output`/`--season` flags as needed if you want to produce other seasons or data files.
