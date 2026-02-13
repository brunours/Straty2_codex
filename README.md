# Straty2 - Bronze Age 4X Strategy Game

A turn-based 4X strategy game set in the Bronze Age, built with Phaser 3.

## Features

- **Procedural hex maps** with continents, oceans, rivers, and 7 terrain types
- **4 map sizes**: Small (20x15) to Huge (100x80)
- **City evolution**: Camp → Village → Town → City
- **4 resources**: Wood, Stone, Food, Metal
- **7 unit types**: Workers, Settlers, Scouts, Spearmen, Archers, Chariots, Boats
- **14 technologies** in a branching Bronze Age tech tree
- **Combined combat**: Unit stats + terrain bonuses + flanking
- **AI opponent** with 3 difficulty levels (Easy, Medium, Hard)
- **Configurable fog of war**: None, Explored-only, or Full
- **Save/Load** via Supabase cloud database
- **2 players**: Human vs AI or Human vs Human (hot-seat)

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone <repository-url>
cd Straty2
npm install
```

### Configuration

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Development

```bash
npm run dev
```

Opens the game at `http://localhost:8080`.

### Production Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **Game Engine**: Phaser 3
- **Language**: JavaScript (ES6 modules)
- **Bundler**: Vite
- **Database**: Supabase (save/load)

## Documentation

- [Game Design Document](documentation.md) - Full game rules and mechanics
- [Release Notes](releaseNotes.md) - Version changelog
- [CLAUDE.md](CLAUDE.md) - Development conventions and architecture

## Current Version

**v0.1.0** - Project Setup

## License

ISC
