# Straty2 - Release Notes

## v0.1.0 - Project Setup (2026-02-13)

### Added
- Initialized project with Phaser 3, Vite, and Supabase
- Created project directory structure
- Added BootScene with title screen placeholder
- Created CLAUDE.md with project instructions and conventions
- Created documentation.md with full game design document
- Set up git repository with .gitignore
- Configured Vite dev server on port 8080

### Technical
- Phaser 3 game engine (v3.90.0)
- Vite bundler (v7.x)
- Supabase JS client for future save/load
- ES6 modules throughout

## v0.2.0 - Core Hex Engine (2026-02-13)

### Added
- Hex math utilities (HexGrid.js): axial/cube coordinates, distance, neighbors, rings, line drawing
- HexMap data structure with terrain, rivers, resources
- Procedural map generation (MapGenerator.js): multi-octave Simplex noise, island mask, terrain classification, rivers, resource placement, continent validation
- HexRenderer with viewport culling, terrain colors, river overlay, resource indicators
- MapTestScene with camera pan (WASD/arrows), zoom (mouse wheel), hex click selection
- SimplexNoise utility, PriorityQueue, MathUtils, ArrayUtils
- Game constants (hex size, map sizes, terrain types, camera settings)
- Terrain configuration (7 terrain types with movement cost, defense, colors)

---

## v0.3.0 - Game State, UI & Camera (2026-02-13)

### Added
- EventBus singleton for pub/sub event system (20 event types)
- GameState singleton for centralized game state management
- TurnManager for turn sequencing (start/end turns, player cycling)
- Command pattern (Command + CommandManager) for game actions
- MainMenuScene with New Game / Load Game buttons
- GameSetupScene with configurable map size, fog of war, AI difficulty, player names, human/AI toggle
- GameScene as primary gameplay orchestrator with camera controls, hex selection, middle-mouse drag panning
- UIScene as parallel HUD overlay
- HUDPanel: player info, turn number, resource display, End Turn button
- SelectionPanel: info panel for selected hex/unit/city
- MinimapRenderer: overview map with camera viewport rectangle and click-to-jump navigation
- Full menu flow: Boot → MainMenu → GameSetup → Game

---

*Future versions will be added here as development progresses.*

*Version roadmap:*
- *0.2.0 - Hex map generation and rendering*
- *0.3.0 - Camera, selection, HUD, minimap*
- *0.4.0 - Cities and resources*
- *0.5.0 - Units and pathfinding*
- *0.6.0 - Tech tree*
- *0.7.0 - Combat and victory*
- *0.8.0 - AI system*
- *0.9.0 - Save/load via Supabase*
- *1.0.0 - Polish and balance*
