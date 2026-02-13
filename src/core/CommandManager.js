/**
 * @file CommandManager.js
 * @description Manages execution of game commands. Provides a central
 * point for all game actions, enabling logging and future undo support.
 * @version 0.3.0
 */

export class CommandManager {
  constructor() {
    /** @type {Array<import('./Command.js').Command>} Command history */
    this._history = [];
    /** @type {number} Max history length */
    this._maxHistory = 100;
  }

  /**
   * Execute a command and add it to history.
   * @param {import('./Command.js').Command} command
   * @returns {boolean} Whether the command succeeded
   */
  execute(command) {
    const success = command.execute();
    if (success) {
      this._history.push(command);
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }
    }
    return success;
  }

  /**
   * Get the history of executed commands.
   * @returns {Array<import('./Command.js').Command>}
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * Clear command history.
   */
  clear() {
    this._history = [];
  }
}
