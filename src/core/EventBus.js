/**
 * @file EventBus.js
 * @description Singleton pub/sub event system for decoupled communication
 * between game systems, entities, and UI.
 * @version 0.3.0
 */

/** Event name constants */
export const EVENTS = {
  HEX_SELECTED: 'hexSelected',
  UNIT_SELECTED: 'unitSelected',
  CITY_SELECTED: 'citySelected',
  TURN_STARTED: 'turnStarted',
  TURN_ENDED: 'turnEnded',
  RESOURCE_CHANGED: 'resourceChanged',
  UNIT_MOVED: 'unitMoved',
  UNIT_CREATED: 'unitCreated',
  UNIT_DESTROYED: 'unitDestroyed',
  COMBAT_RESOLVED: 'combatResolved',
  TECH_RESEARCHED: 'techResearched',
  TECH_STARTED: 'techStarted',
  CITY_FOUNDED: 'cityFounded',
  CITY_EVOLVED: 'cityEvolved',
  CITY_CAPTURED: 'cityCaptured',
  VICTORY: 'victory',
  SELECTION_CLEARED: 'selectionCleared',
  FOG_UPDATED: 'fogUpdated',
  GAME_STARTED: 'gameStarted',
  GAME_LOADED: 'gameLoaded'
};

class EventBusClass {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event, but only fire once.
   * @param {string} event
   * @param {Function} callback
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit an event with data.
   * @param {string} event - Event name
   * @param {*} [data] - Event data
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }

  /**
   * Remove all listeners for an event, or all events.
   * @param {string} [event] - If omitted, clears all
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

/** Singleton EventBus instance */
export const EventBus = new EventBusClass();
