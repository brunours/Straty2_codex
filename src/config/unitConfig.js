/**
 * @file unitConfig.js
 * @description Unit roster and city progression data for the playable core loop.
 */

export const UNIT_TYPES = {
  SETTLER: 'settler',
  SCOUT: 'scout',
  SPEARMAN: 'spearman',
  ARCHER: 'archer'
};

export const UNIT_CONFIG = {
  [UNIT_TYPES.SETTLER]: {
    label: 'Settler',
    symbol: 'S',
    maxHp: 6,
    attack: 1,
    defense: 1,
    range: 1,
    movement: 2,
    visionRange: 2,
    turnCost: 4,
    cost: { food: 32, wood: 8, stone: 0, metal: 0 },
    canFoundCity: true,
    canCapture: false,
    naval: false,
    aiRole: 'expansion'
  },
  [UNIT_TYPES.SCOUT]: {
    label: 'Scout',
    symbol: 'C',
    maxHp: 9,
    attack: 3,
    defense: 2,
    range: 1,
    movement: 4,
    visionRange: 4,
    turnCost: 2,
    cost: { food: 18, wood: 0, stone: 0, metal: 0 },
    canFoundCity: false,
    canCapture: false,
    naval: false,
    aiRole: 'explore'
  },
  [UNIT_TYPES.SPEARMAN]: {
    label: 'Spearman',
    symbol: 'P',
    maxHp: 15,
    attack: 6,
    defense: 8,
    range: 1,
    movement: 2,
    visionRange: 2,
    turnCost: 3,
    cost: { food: 24, wood: 0, stone: 0, metal: 8 },
    canFoundCity: false,
    canCapture: true,
    naval: false,
    aiRole: 'assault'
  },
  [UNIT_TYPES.ARCHER]: {
    label: 'Archer',
    symbol: 'A',
    maxHp: 10,
    attack: 7,
    defense: 3,
    range: 2,
    movement: 2,
    visionRange: 3,
    turnCost: 3,
    cost: { food: 22, wood: 10, stone: 0, metal: 0 },
    canFoundCity: false,
    canCapture: true,
    naval: false,
    aiRole: 'support'
  }
};

export const PRODUCTION_ORDER = [
  UNIT_TYPES.SCOUT,
  UNIT_TYPES.SETTLER,
  UNIT_TYPES.SPEARMAN,
  UNIT_TYPES.ARCHER
];

export const CITY_LEVELS = [
  { label: 'Camp', radius: 1, populationCap: 3 },
  { label: 'Village', radius: 2, populationCap: 7 },
  { label: 'Town', radius: 3, populationCap: 15 },
  { label: 'City', radius: 4, populationCap: 30 }
];

export function getUnitConfig(type) {
  return UNIT_CONFIG[type];
}

export function getCityLevel(level) {
  return CITY_LEVELS[Math.max(0, Math.min(CITY_LEVELS.length - 1, level))];
}
