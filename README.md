# Forest Grimoire

Forest Grimoire is an atmospheric mobile journal app for personal notes, seasonal rituals, daily cards, wishes, recipes, memories, and quiet self-reflection.

The app is built around the feeling of opening a private forest notebook: dark greens, old paper, moonlight, candles, plants, seasonal paths, and hand-kept memories.

## Features

- Personal journal with mood, tags, photos, and seasonal links.
- Wheel of the Year with seasonal pages and yearly notes.
- Daily cards with archive and favorites.
- Wishes, recipes, treasures, memories, and reminders.
- Personal path mini-game with familiars, dragons, scenes, skills, and collectibles.
- Local-first storage for private app data.
- Android packaging through Capacitor.
- Import, export, and local backup flows.

## Tech Stack

- React 18
- TypeScript
- Vite
- Capacitor 8 for Android
- React Router
- Local storage for app data
- Sharp for offline image optimization

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build the web app:

```bash
npm run build
```

Sync the Android project:

```bash
npm run android:sync
```

Open the Android project:

```bash
npm run android:open
```

## Assets

Source art is kept in project folders such as `cards/`, `pets/`, `runes/`, `story/`, and `wheel/`.

Optimized runtime assets live under `src/assets/`. Run the optimizer when source images change:

```bash
npm run optimize-images
```

## Privacy

Forest Grimoire is designed as a personal app. User content is stored locally unless the user explicitly exports or shares it.
