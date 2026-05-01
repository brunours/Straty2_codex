/**
 * @file TurnManager.js
 * @description Manages turn sequencing: start turn processing, end turn,
 * advance to next player, trigger AI turns.
 * @version 0.3.0
 */

import { GameState } from './GameState.js';
import { EventBus, EVENTS } from './EventBus.js';
import { GameplayCore } from './GameplayCore.js';

export class TurnManager {
  constructor() {
    /** @type {boolean} Whether it's currently processing a turn transition */
    this._processing = false;
  }

  /**
   * Initialize a new game turn sequence (called at game start).
   */
  startGame() {
    GameState.isGameActive = true;
    GameState.turnNumber = 1;
    GameState.currentPlayerIndex = 0;

    EventBus.emit(EVENTS.GAME_STARTED, {
      turnNumber: GameState.turnNumber,
      playerIndex: GameState.currentPlayerIndex
    });

    this._startTurn();
  }

  /**
   * End the current player's turn and advance to the next.
   */
  endTurn() {
    if (this._processing) return;
    this._processing = true;

    const currentPlayer = GameState.getCurrentPlayer();

    // Reset unit movement for current player
    GameState.getPlayerUnits(GameState.currentPlayerIndex).forEach(unit => {
      unit.hasMoved = false;
      unit.hasActed = false;
      unit.movementRemaining = unit.movement;
    });

    EventBus.emit(EVENTS.TURN_ENDED, {
      turnNumber: GameState.turnNumber,
      playerIndex: GameState.currentPlayerIndex
    });

    // Advance to next player
    GameState.currentPlayerIndex = (GameState.currentPlayerIndex + 1) % GameState.players.length;

    // If back to player 0, increment turn number
    if (GameState.currentPlayerIndex === 0) {
      GameState.turnNumber++;
    }

    this._processing = false;
    this._startTurn();
  }

  /**
   * Process start-of-turn effects for the current player.
   * @private
   */
  _startTurn() {
    const playerIndex = GameState.currentPlayerIndex;
    const player = GameState.getCurrentPlayer();

    GameplayCore.processStartOfTurn(playerIndex);

    // Reset movement for new turn's units
    GameState.getPlayerUnits(playerIndex).forEach(unit => {
      unit.movementRemaining = unit.movement;
      unit.hasMoved = false;
      unit.hasActed = false;
    });

    EventBus.emit(EVENTS.TURN_STARTED, {
      turnNumber: GameState.turnNumber,
      playerIndex,
      playerName: player.name,
      isAI: player.isAI
    });
  }

  /**
   * Check if the current player is AI.
   * @returns {boolean}
   */
  isAITurn() {
    const player = GameState.getCurrentPlayer();
    return player && player.isAI;
  }
}
