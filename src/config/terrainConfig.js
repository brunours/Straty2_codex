/**
 * @file terrainConfig.js
 * @description Terrain type properties: movement cost, defense bonus, color, and resource.
 * @version 0.2.0
 */

import { TERRAIN } from './constants.js';

/**
 * Terrain property definitions.
 * @type {Object<string, {moveCost: number, defenseBonus: number, color: number, passable: boolean, resource: string|null, label: string}>}
 */
export const TERRAIN_CONFIG = {
  [TERRAIN.OCEAN]: {
    moveCost: Infinity,
    defenseBonus: 0,
    color: 0x2266aa,
    passable: false,
    naval: true,
    resource: null,
    label: 'Ocean'
  },
  [TERRAIN.GRASSLAND]: {
    moveCost: 1,
    defenseBonus: 0,
    color: 0x66aa44,
    passable: true,
    naval: false,
    resource: 'food',
    label: 'Grassland'
  },
  [TERRAIN.FOREST]: {
    moveCost: 2,
    defenseBonus: 1,
    color: 0x337733,
    passable: true,
    naval: false,
    resource: 'wood',
    label: 'Forest'
  },
  [TERRAIN.MOUNTAIN]: {
    moveCost: 3,
    defenseBonus: 2,
    color: 0x888888,
    passable: true,
    naval: false,
    resource: 'stone',
    label: 'Mountain'
  },
  [TERRAIN.DESERT]: {
    moveCost: 2,
    defenseBonus: 0,
    color: 0xccbb77,
    passable: true,
    naval: false,
    resource: null,
    label: 'Desert'
  },
  [TERRAIN.HILLS]: {
    moveCost: 2,
    defenseBonus: 1,
    color: 0x99aa55,
    passable: true,
    naval: false,
    resource: 'metal',
    label: 'Hills'
  },
  [TERRAIN.SWAMP]: {
    moveCost: 3,
    defenseBonus: -1,
    color: 0x557755,
    passable: true,
    naval: false,
    resource: null,
    label: 'Swamp'
  }
};

/**
 * Get terrain config for a given terrain type.
 * @param {string} terrainType - One of TERRAIN constants
 * @returns {Object} Terrain configuration
 */
export function getTerrainConfig(terrainType) {
  return TERRAIN_CONFIG[terrainType] || TERRAIN_CONFIG[TERRAIN.OCEAN];
}
