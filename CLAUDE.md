# CLAUDE.md - Straty2 Project Instructions

## Project Overview

**Straty2** is a Bronze Age 4X hex strategy game built with Phaser 3 and JavaScript (ES6 modules). It is a 2-player game (human vs AI or hot-seat) featuring procedural map generation, city evolution, resource management, a branching tech tree, combined combat, and utility-based AI with 3 difficulty levels. Save/load is handled via Supabase.

## Build & Run Commands

```bash
npm run dev      # Start Vite dev server on port 8080
npm run build    # Build for production to dist/
npm run preview  # Preview production build locally
```

## Architecture

The project follows a modular architecture with clear separation of concerns:

```
src/
├── config/       # Static configuration (constants, unit stats, tech tree, AI params)
├── scenes/       # Phaser scenes (BootScene, MainMenu, GameSetup, GameScene, UIScene, etc.)
├── core/         # Core engine (HexGrid math, HexMap, MapGenerator, GameState, TurnManager, EventBus, CommandManager)
├── entities/     # Game entities (Player, City, Unit, ResourceNode)
├── systems/      # Game systems (Movement, Combat, Resource, City, Tech, FogOfWar, Victory)
├── ai/           # AI system (AIController, UtilityScorer, AIActions, AIPersonality)
├── ui/           # UI renderers (HexRenderer, UnitRenderer, CityRenderer, FogRenderer, HUD panels)
├── persistence/  # Save/load (SupabaseClient, SaveManager, LoadManager)
└── utils/        # Utilities (SimplexNoise, PriorityQueue, MathUtils)
```

## Key Design Patterns

- **Command Pattern**: All game actions (move, attack, found city, research) are encapsulated as Command objects via `CommandManager`. This enables potential undo/redo.
- **Event Bus**: Decoupled communication between systems using `EventBus` singleton (pub/sub pattern). Key events: HEX_SELECTED, UNIT_MOVED, COMBAT_RESOLVED, TECH_RESEARCHED, CITY_FOUNDED, TURN_STARTED, TURN_ENDED, VICTORY.
- **Utility-based AI**: AI scores all possible actions with utility functions and picks the highest-scoring one. Difficulty adjusts weights and randomness.
- **Singleton GameState**: Central source of truth for the entire game. All systems read/write through it.

## Hex Coordinate Convention

- **Orientation**: Flat-top hexagons
- **Storage**: Axial coordinates (q, r)
- **Algorithms**: Cube coordinates (q, r, s where s = -q - r)
- **Map key**: String `"q,r"` used as Map keys
- **Pixel conversion** (flat-top):
  - x = size * (3/2 * q)
  - y = size * (sqrt(3)/2 * q + sqrt(3) * r)
- **Reference**: Red Blob Games hexagonal grids guide

## Coding Conventions

- **Language**: JavaScript ES6+ with ES modules (`import`/`export`)
- **Classes**: ES6 classes for all entities, systems, and scenes
- **Documentation**: JSDoc comments on all public methods and classes
- **File headers**: Every file must have a `@file`, `@description`, and `@version` JSDoc block
- **Constants**: UPPER_SNAKE_CASE for constants, exported from config files
- **Event names**: UPPER_SNAKE_CASE strings (e.g., `'TURN_STARTED'`)
- **No magic numbers**: All numeric constants defined in `config/constants.js`
- **Error handling**: Validate inputs in public methods, use descriptive error messages

## Versioning

Semantic versioning (MAJOR.MINOR.PATCH). Current: 0.1.0 (Phase 0 - Project Setup).
See `releaseNotes.md` for full changelog.

## Game Constants Quick Reference

- **Map sizes**: Small (20x15), Medium (30x25), Large (50x40), Huge (100x80)
- **Hex size**: 32 pixels (outer radius)
- **Resources**: Wood, Stone, Food, Metal
- **City levels**: Camp (0) → Village (1) → Town (2) → City (3)
- **Unit types**: Worker, Settler, Scout, Spearman, Archer, Chariot, Boat
- **Tech count**: 14 technologies in 3 branches (economic, military, naval)
- **AI difficulties**: Easy, Medium, Hard
- **Fog modes**: None, Explored-only, Full fog of war
- **Victory**: Conquest (destroy all enemy cities)

## Testing

- Manual play-testing after each phase
- Debug overlay (backtick key): hex coords, unit stats, FPS, state dump
- Console assertions in hex math and pathfinding
- Save/load round-trip verification
- AI stress test: two AIs play a full game
