/**
 * @file constants.js
 * @description Game-wide constants for Straty2.
 * @version 0.2.0
 */

/** Hex outer radius in pixels */
export const HEX_SIZE = 32;

/** Hex width (flat-top): sqrt(3) * size */
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;

/** Hex height (flat-top): 2 * size */
export const HEX_HEIGHT = 2 * HEX_SIZE;

/** Map size presets: { cols, rows } */
export const MAP_SIZES = {
  SMALL:  { cols: 20, rows: 15, label: 'Small (20x15)' },
  MEDIUM: { cols: 30, rows: 25, label: 'Medium (30x25)' },
  LARGE:  { cols: 50, rows: 40, label: 'Large (50x40)' },
  HUGE:   { cols: 100, rows: 80, label: 'Huge (100x80)' }
};

/** Terrain type identifiers */
export const TERRAIN = {
  OCEAN:     'ocean',
  GRASSLAND: 'grassland',
  FOREST:    'forest',
  MOUNTAIN:  'mountain',
  DESERT:    'desert',
  HILLS:     'hills',
  SWAMP:     'swamp'
};

/** Fog of war modes */
export const FOG_MODE = {
  NONE:          'none',
  EXPLORED_ONLY: 'exploredOnly',
  FULL:          'full'
};

/** Fog visibility states */
export const FOG_STATE = {
  HIDDEN:   'hidden',
  EXPLORED: 'explored',
  VISIBLE:  'visible'
};

/** Player colors */
export const PLAYER_COLORS = {
  PLAYER_1: 0x4488ff,
  PLAYER_2: 0xff4444
};

/** Six axial direction vectors for flat-top hex neighbors */
export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

/** Game canvas dimensions */
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

/** Camera zoom limits */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.1;

/** Camera pan speed in pixels per frame */
export const PAN_SPEED = 10;
