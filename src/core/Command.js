/**
 * @file Command.js
 * @description Base command class for the command pattern.
 * All game actions should extend this class.
 * @version 0.3.0
 */

export class Command {
  /**
   * Execute the command.
   * @returns {boolean} Whether the command succeeded
   */
  execute() {
    throw new Error('Command.execute() must be overridden');
  }

  /**
   * Undo the command (optional, for future use).
   */
  undo() {
    // Default: no-op. Override in subclasses that support undo.
  }

  /**
   * Get a human-readable description.
   * @returns {string}
   */
  toString() {
    return 'Command';
  }
}
