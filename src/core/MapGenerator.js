/**
 * @file MapGenerator.js
 * @description Procedural hex map generation using multi-octave Simplex noise.
 * Generates elevation + moisture layers, applies island mask, classifies terrain,
 * generates rivers, and places resource nodes.
 * @version 0.2.0
 */

import { HexGrid } from './HexGrid.js';
import { HexMap } from './HexMap.js';
import { SimplexNoise } from '../utils/SimplexNoise.js';
import { TERRAIN } from '../config/constants.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';

/** Noise scale factors */
const ELEVATION_SCALE = 0.06;
const MOISTURE_SCALE = 0.08;

/** Terrain classification thresholds */
const OCEAN_THRESHOLD = 0.30;
const SWAMP_ELEVATION_MAX = 0.35;
const SWAMP_MOISTURE_MIN = 0.60;
const LOWLAND_MAX = 0.50;
const FOREST_MOISTURE = 0.40;
const DESERT_MOISTURE = 0.30;
const HILLS_MAX = 0.70;

/** River generation parameters */
const RIVER_SOURCE_ELEVATION = 0.65;
const MAX_RIVER_ATTEMPTS = 20;

/** Resource placement probability */
const RESOURCE_COVERAGE = 0.60;

export class MapGenerator {
  /**
   * Generate a complete hex map.
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   * @param {number} [seed] - Optional seed for reproducible maps
   * @returns {HexMap}
   */
  static generate(cols, rows, seed) {
    const actualSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);
    const elevNoise = new SimplexNoise(actualSeed);
    const moistNoise = new SimplexNoise(actualSeed + 1000);

    const map = new HexMap(cols, rows);

    // Step 1: Generate elevation and moisture, classify terrain
    MapGenerator._generateTerrain(map, cols, rows, elevNoise, moistNoise);

    // Step 2: Generate rivers
    MapGenerator._generateRivers(map, cols, rows);

    // Step 3: Place resource nodes
    MapGenerator._placeResources(map);

    return map;
  }

  /**
   * Generate terrain for all hexes using noise layers and island mask.
   * @private
   */
  static _generateTerrain(map, cols, rows, elevNoise, moistNoise) {
    for (let q = 0; q < cols; q++) {
      for (let r = 0; r < rows; r++) {
        // Get raw noise values
        let elevation = elevNoise.fractal(
          q * ELEVATION_SCALE,
          r * ELEVATION_SCALE,
          4, 2.0, 0.5
        );
        const moisture = moistNoise.fractal(
          q * MOISTURE_SCALE,
          r * MOISTURE_SCALE,
          3, 2.0, 0.5
        );

        // Apply island mask (radial gradient to ensure ocean borders)
        const islandMask = MapGenerator._getIslandMask(q, r, cols, rows);
        elevation = elevation * islandMask;

        // Classify terrain
        const terrain = MapGenerator._classifyTerrain(elevation, moisture);

        map.setHex(q, r, {
          q,
          r,
          terrain,
          hasRiver: false,
          elevation,
          moisture,
          resourceType: null,
          hasResource: false,
          cityId: null,
          unitId: null
        });
      }
    }
  }

  /**
   * Island mask: radial gradient that pushes edges toward ocean.
   * @private
   * @param {number} q
   * @param {number} r
   * @param {number} cols
   * @param {number} rows
   * @returns {number} Mask value (0 at edges, 1 at center)
   */
  static _getIslandMask(q, r, cols, rows) {
    // Normalize to [-1, 1]
    const nx = (q / cols) * 2 - 1;
    const ny = (r / rows) * 2 - 1;

    // Squared distance from center (using max for rectangular feel)
    const d = Math.max(Math.abs(nx), Math.abs(ny));

    // Smooth falloff: 1 at center, 0 at edges
    // Use a curve that creates interesting coastlines
    return Math.max(0, 1 - d * d * 1.2);
  }

  /**
   * Classify terrain type from elevation and moisture.
   * @private
   * @param {number} elevation - 0 to 1
   * @param {number} moisture - 0 to 1
   * @returns {string} Terrain type
   */
  static _classifyTerrain(elevation, moisture) {
    if (elevation < OCEAN_THRESHOLD) {
      return TERRAIN.OCEAN;
    }
    if (elevation < SWAMP_ELEVATION_MAX && moisture > SWAMP_MOISTURE_MIN) {
      return TERRAIN.SWAMP;
    }
    if (elevation < LOWLAND_MAX) {
      if (moisture < FOREST_MOISTURE) {
        return TERRAIN.GRASSLAND;
      }
      return TERRAIN.FOREST;
    }
    if (elevation < LOWLAND_MAX + 0.05 && moisture < DESERT_MOISTURE) {
      return TERRAIN.DESERT;
    }
    if (elevation < HILLS_MAX) {
      return TERRAIN.HILLS;
    }
    return TERRAIN.MOUNTAIN;
  }

  /**
   * Generate rivers flowing from mountains to ocean.
   * @private
   */
  static _generateRivers(map, cols, rows) {
    // Find potential river sources (high elevation hexes)
    const sources = [];
    map.forEachHex((hex) => {
      if (hex.elevation >= RIVER_SOURCE_ELEVATION && hex.terrain === TERRAIN.MOUNTAIN) {
        sources.push(hex);
      }
    });

    // Shuffle and pick some sources
    const numRivers = Math.min(
      Math.floor(sources.length * 0.15),
      MAX_RIVER_ATTEMPTS
    );

    // Simple shuffle
    for (let i = sources.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sources[i], sources[j]] = [sources[j], sources[i]];
    }

    for (let i = 0; i < numRivers; i++) {
      MapGenerator._traceRiver(map, sources[i], cols, rows);
    }
  }

  /**
   * Trace a single river from source downhill to ocean.
   * @private
   */
  static _traceRiver(map, source, cols, rows) {
    let current = source;
    const visited = new Set();
    const maxSteps = cols + rows;

    for (let step = 0; step < maxSteps; step++) {
      const key = HexGrid.key(current.q, current.r);
      if (visited.has(key)) break;
      visited.add(key);

      // Mark river (don't mark ocean or mountains)
      if (current.terrain !== TERRAIN.OCEAN && current.terrain !== TERRAIN.MOUNTAIN) {
        current.hasRiver = true;
      }

      // Reached ocean, stop
      if (current.terrain === TERRAIN.OCEAN) break;

      // Find lowest neighbor
      const neighbors = HexGrid.getNeighbors(current.q, current.r);
      let lowestNeighbor = null;
      let lowestElevation = current.elevation;

      for (const n of neighbors) {
        const hex = map.getHex(n.q, n.r);
        if (!hex) continue;
        if (visited.has(HexGrid.key(n.q, n.r))) continue;
        if (hex.elevation < lowestElevation) {
          lowestElevation = hex.elevation;
          lowestNeighbor = hex;
        }
      }

      if (!lowestNeighbor) break; // Stuck in a local minimum
      current = lowestNeighbor;
    }
  }

  /**
   * Place resource nodes on appropriate terrain.
   * @private
   */
  static _placeResources(map) {
    map.forEachHex((hex) => {
      const config = TERRAIN_CONFIG[hex.terrain];
      if (!config || !config.resource) return;

      // Probabilistic placement
      if (Math.random() < RESOURCE_COVERAGE) {
        hex.hasResource = true;
        hex.resourceType = config.resource;
      }
    });
  }

  /**
   * Validate that the map has at least 2 distinct landmasses.
   * Uses flood fill to count separate land regions.
   * @param {HexMap} map
   * @returns {boolean}
   */
  static validateContinents(map) {
    const visited = new Set();
    let continentCount = 0;

    map.forEachHex((hex) => {
      const key = HexGrid.key(hex.q, hex.r);
      if (visited.has(key)) return;
      if (hex.terrain === TERRAIN.OCEAN) return;

      // Flood fill from this land hex
      continentCount++;
      const stack = [hex];
      while (stack.length > 0) {
        const current = stack.pop();
        const cKey = HexGrid.key(current.q, current.r);
        if (visited.has(cKey)) continue;
        visited.add(cKey);

        const neighbors = HexGrid.getNeighbors(current.q, current.r);
        for (const n of neighbors) {
          const nHex = map.getHex(n.q, n.r);
          if (!nHex) continue;
          if (nHex.terrain === TERRAIN.OCEAN) continue;
          if (visited.has(HexGrid.key(n.q, n.r))) continue;
          stack.push(nHex);
        }
      }
    });

    return continentCount >= 2;
  }

  /**
   * Generate a map, retrying until it has at least 2 continents.
   * @param {number} cols
   * @param {number} rows
   * @param {number} [seed]
   * @param {number} [maxAttempts=10]
   * @returns {HexMap}
   */
  static generateValidated(cols, rows, seed, maxAttempts = 10) {
    let currentSeed = seed !== undefined ? seed : Math.floor(Math.random() * 2147483647);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const map = MapGenerator.generate(cols, rows, currentSeed);
      if (MapGenerator.validateContinents(map)) {
        return map;
      }
      currentSeed += 7919; // Prime offset for next attempt
    }

    // Fallback: return last generated map even if validation fails
    return MapGenerator.generate(cols, rows, currentSeed);
  }
}
