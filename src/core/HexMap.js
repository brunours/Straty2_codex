/**
 * @file HexMap.js
 * @description Hex map data structure using Map<"q,r", HexData>.
 * @version 0.2.0
 */

import { HexGrid } from './HexGrid.js';
import { TERRAIN } from '../config/constants.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';

/**
 * @typedef {Object} HexData
 * @property {number} q - Axial q coordinate
 * @property {number} r - Axial r coordinate
 * @property {string} terrain - Terrain type from TERRAIN enum
 * @property {boolean} hasRiver - Whether this hex has a river overlay
 * @property {number} elevation - Raw elevation value (0-1)
 * @property {number} moisture - Raw moisture value (0-1)
 * @property {string|null} resourceType - Resource type if present
 * @property {boolean} hasResource - Whether a resource node exists here
 * @property {string|null} cityId - ID of city on this hex, if any
 * @property {string|null} unitId - ID of unit on this hex, if any
 */

export class HexMap {
  /**
   * Create a new HexMap.
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   */
  constructor(cols, rows) {
    /** @type {number} */
    this.cols = cols;
    /** @type {number} */
    this.rows = rows;
    /** @type {Map<string, HexData>} */
    this._hexes = new Map();
  }

  /**
   * Get hex data at (q, r).
   * @param {number} q
   * @param {number} r
   * @returns {HexData|null}
   */
  getHex(q, r) {
    return this._hexes.get(HexGrid.key(q, r)) || null;
  }

  /**
   * Set hex data at (q, r).
   * @param {number} q
   * @param {number} r
   * @param {HexData} data
   */
  setHex(q, r, data) {
    this._hexes.set(HexGrid.key(q, r), data);
  }

  /**
   * Check if coordinates are within map bounds.
   * @param {number} q
   * @param {number} r
   * @returns {boolean}
   */
  isInBounds(q, r) {
    return this._hexes.has(HexGrid.key(q, r));
  }

  /**
   * Check if a hex is passable by land units.
   * @param {number} q
   * @param {number} r
   * @returns {boolean}
   */
  isPassable(q, r) {
    const hex = this.getHex(q, r);
    if (!hex) return false;
    const config = TERRAIN_CONFIG[hex.terrain];
    return config ? config.passable : false;
  }

  /**
   * Check if a hex is navigable by naval units.
   * @param {number} q
   * @param {number} r
   * @returns {boolean}
   */
  isNaval(q, r) {
    const hex = this.getHex(q, r);
    if (!hex) return false;
    return hex.terrain === TERRAIN.OCEAN;
  }

  /**
   * Get movement cost for a hex.
   * @param {number} q
   * @param {number} r
   * @returns {number} Movement cost (Infinity for impassable)
   */
  getMoveCost(q, r) {
    const hex = this.getHex(q, r);
    if (!hex) return Infinity;
    const config = TERRAIN_CONFIG[hex.terrain];
    return config ? config.moveCost : Infinity;
  }

  /**
   * Get defense bonus for a hex.
   * @param {number} q
   * @param {number} r
   * @returns {number}
   */
  getDefenseBonus(q, r) {
    const hex = this.getHex(q, r);
    if (!hex) return 0;
    const config = TERRAIN_CONFIG[hex.terrain];
    return config ? config.defenseBonus : 0;
  }

  /**
   * Iterate over all hexes.
   * @param {function(HexData, string): void} callback - Called with (hexData, key)
   */
  forEachHex(callback) {
    this._hexes.forEach((data, key) => callback(data, key));
  }

  /**
   * Get all hex data as an array.
   * @returns {Array<HexData>}
   */
  getAllHexes() {
    return Array.from(this._hexes.values());
  }

  /** @returns {number} Total number of hexes */
  get size() {
    return this._hexes.size;
  }

  /**
   * Serialize map to JSON-safe object.
   * @returns {Object}
   */
  toJSON() {
    const hexArray = [];
    this._hexes.forEach((data) => {
      hexArray.push({
        q: data.q,
        r: data.r,
        terrain: data.terrain,
        hasRiver: data.hasRiver,
        elevation: data.elevation,
        moisture: data.moisture,
        resourceType: data.resourceType,
        hasResource: data.hasResource
      });
    });
    return {
      cols: this.cols,
      rows: this.rows,
      hexes: hexArray
    };
  }

  /**
   * Deserialize map from JSON data.
   * @param {Object} json
   * @returns {HexMap}
   */
  static fromJSON(json) {
    const map = new HexMap(json.cols, json.rows);
    for (const h of json.hexes) {
      map.setHex(h.q, h.r, {
        q: h.q,
        r: h.r,
        terrain: h.terrain,
        hasRiver: h.hasRiver || false,
        elevation: h.elevation || 0,
        moisture: h.moisture || 0,
        resourceType: h.resourceType || null,
        hasResource: h.hasResource || false,
        cityId: null,
        unitId: null
      });
    }
    return map;
  }
}
