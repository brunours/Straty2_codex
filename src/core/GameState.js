/**
 * @file GameState.js
 * @description Central game state singleton. Single source of truth for all
 * game data: map, players, units, cities, settings, turn info.
 * @version 0.3.0
 */

import { HexMap } from './HexMap.js';
import { HexGrid } from './HexGrid.js';

class GameStateClass {
  constructor() {
    this.reset();
  }

  /**
   * Reset state to defaults. Called before starting a new game.
   */
  reset() {
    /** @type {HexMap|null} */
    this.hexMap = null;

    /** @type {Array<Object>} Player data objects */
    this.players = [];

    /** @type {number} Index into players array for whose turn it is */
    this.currentPlayerIndex = 0;

    /** @type {number} Current turn number (starts at 1) */
    this.turnNumber = 1;

    /** @type {Map<string, Object>} All units by ID */
    this.units = new Map();

    /** @type {Map<string, Object>} All cities by ID */
    this.cities = new Map();

    /** @type {Object} Game settings from setup screen */
    this.settings = {
      mapSize: 'MEDIUM',
      fogMode: 'none',
      aiDifficulty: 'MEDIUM',
      player1Name: 'Player 1',
      player2Name: 'Player 2',
      player2IsAI: true
    };

    /** @type {string|null} Currently selected entity type: 'hex', 'unit', 'city' */
    this.selectionType = null;

    /** @type {Object|null} Currently selected entity data */
    this.selectionData = null;

    /** @type {boolean} Whether the game is in progress */
    this.isGameActive = false;

    /** @type {number|null} Winning player index once the match ends */
    this.winnerIndex = null;

    /** @type {Array<string>} Recent game messages for UI/debugging */
    this.messageLog = [];

    /** @type {number} Next unit ID counter */
    this._nextUnitId = 1;

    /** @type {number} Next city ID counter */
    this._nextCityId = 1;
  }

  /**
   * Get the current player object.
   * @returns {Object}
   */
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  /**
   * Get a player by index.
   * @param {number} index
   * @returns {Object}
   */
  getPlayer(index) {
    return this.players[index];
  }

  /**
   * Generate a unique unit ID.
   * @returns {string}
   */
  generateUnitId() {
    return `u${this._nextUnitId++}`;
  }

  /**
   * Generate a unique city ID.
   * @returns {string}
   */
  generateCityId() {
    return `c${this._nextCityId++}`;
  }

  /**
   * Add a unit to the game state.
   * @param {Object} unit
   */
  addUnit(unit) {
    this.units.set(unit.id, unit);
    // Update hex
    const hex = this.hexMap.getHex(unit.q, unit.r);
    if (hex) hex.unitId = unit.id;
  }

  /**
   * Remove a unit from the game state.
   * @param {string} unitId
   */
  removeUnit(unitId) {
    const unit = this.units.get(unitId);
    if (unit) {
      const hex = this.hexMap.getHex(unit.q, unit.r);
      if (hex && hex.unitId === unitId) hex.unitId = null;
      this.units.delete(unitId);
    }
  }

  /**
   * Add a city to the game state.
   * @param {Object} city
   */
  addCity(city) {
    this.cities.set(city.id, city);
    const hex = this.hexMap.getHex(city.q, city.r);
    if (hex) hex.cityId = city.id;
  }

  /**
   * Remove a city from the game state.
   * @param {string} cityId
   */
  removeCity(cityId) {
    const city = this.cities.get(cityId);
    if (city) {
      const hex = this.hexMap.getHex(city.q, city.r);
      if (hex && hex.cityId === cityId) hex.cityId = null;
      this.cities.delete(cityId);
    }
  }

  /**
   * Get all units belonging to a player.
   * @param {number} playerIndex
   * @returns {Array<Object>}
   */
  getPlayerUnits(playerIndex) {
    const result = [];
    this.units.forEach(unit => {
      if (unit.playerIndex === playerIndex) result.push(unit);
    });
    return result;
  }

  /**
   * Get all cities belonging to a player.
   * @param {number} playerIndex
   * @returns {Array<Object>}
   */
  getPlayerCities(playerIndex) {
    const result = [];
    this.cities.forEach(city => {
      if (city.playerIndex === playerIndex) result.push(city);
    });
    return result;
  }

  /**
   * Get the unit at a specific hex, if any.
   * @param {number} q
   * @param {number} r
   * @returns {Object|null}
   */
  getUnitAt(q, r) {
    const hex = this.hexMap.getHex(q, r);
    if (!hex || !hex.unitId) return null;
    return this.units.get(hex.unitId) || null;
  }

  /**
   * Get the city at a specific hex, if any.
   * @param {number} q
   * @param {number} r
   * @returns {Object|null}
   */
  getCityAt(q, r) {
    const hex = this.hexMap.getHex(q, r);
    if (!hex || !hex.cityId) return null;
    return this.cities.get(hex.cityId) || null;
  }

  /**
   * Serialize game state for save/load.
   * @returns {Object}
   */
  toJSON() {
    const unitsData = [];
    this.units.forEach(u => unitsData.push({ ...u }));

    const citiesData = [];
    this.cities.forEach(c => citiesData.push({ ...c }));

    return {
      turnNumber: this.turnNumber,
      currentPlayerIndex: this.currentPlayerIndex,
      settings: { ...this.settings },
      players: this.players.map(p => ({ ...p })),
      map: this.hexMap.toJSON(),
      units: unitsData,
      cities: citiesData,
      winnerIndex: this.winnerIndex,
      messageLog: [...this.messageLog],
      nextUnitId: this._nextUnitId,
      nextCityId: this._nextCityId
    };
  }

  /**
   * Load game state from JSON data.
   * @param {Object} json
   */
  fromJSON(json) {
    this.reset();
    this.turnNumber = json.turnNumber;
    this.currentPlayerIndex = json.currentPlayerIndex;
    this.settings = { ...json.settings };
    this.players = json.players.map(p => ({ ...p }));
    this.hexMap = HexMap.fromJSON(json.map);
    this.winnerIndex = json.winnerIndex ?? null;
    this.messageLog = Array.isArray(json.messageLog) ? [...json.messageLog] : [];
    this._nextUnitId = json.nextUnitId || 1;
    this._nextCityId = json.nextCityId || 1;

    for (const u of json.units) {
      this.units.set(u.id, { ...u });
      const hex = this.hexMap.getHex(u.q, u.r);
      if (hex) hex.unitId = u.id;
    }

    for (const c of json.cities) {
      this.cities.set(c.id, { ...c });
      const hex = this.hexMap.getHex(c.q, c.r);
      if (hex) hex.cityId = c.id;
    }

    this.isGameActive = true;
  }

  /**
   * Add a message to the rolling game log.
   * @param {string} message
   */
  pushMessage(message) {
    this.messageLog.unshift(message);
    this.messageLog = this.messageLog.slice(0, 8);
  }
}

/** Singleton GameState instance */
export const GameState = new GameStateClass();
