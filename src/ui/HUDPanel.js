/**
 * @file HUDPanel.js
 * @description Top bar HUD showing player info, turn number, resources,
 * and the End Turn button.
 * @version 0.3.0
 */

import { GameState } from '../core/GameState.js';
import { EventBus, EVENTS } from '../core/EventBus.js';

/** HUD bar height */
const HUD_HEIGHT = 44;
const HUD_BG_COLOR = 0x1a1a2e;
const HUD_BG_ALPHA = 0.9;
const HUD_BORDER_COLOR = 0x333355;

export class HUDPanel {
  /**
   * @param {Phaser.Scene} scene - The UIScene
   */
  constructor(scene) {
    this.scene = scene;
    const { width } = scene.cameras.main;

    // Background bar
    this._bg = scene.add.graphics();
    this._bg.fillStyle(HUD_BG_COLOR, HUD_BG_ALPHA);
    this._bg.fillRect(0, 0, width, HUD_HEIGHT);
    this._bg.lineStyle(1, HUD_BORDER_COLOR, 1);
    this._bg.lineBetween(0, HUD_HEIGHT, width, HUD_HEIGHT);

    // Player name & color indicator
    this._playerDot = scene.add.graphics();
    this._playerText = scene.add.text(30, HUD_HEIGHT / 2, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Turn number
    this._turnText = scene.add.text(200, HUD_HEIGHT / 2, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa'
    }).setOrigin(0, 0.5);

    // Resources
    this._resourceText = scene.add.text(330, HUD_HEIGHT / 2, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#cccccc'
    }).setOrigin(0, 0.5);

    // End Turn button
    this._createEndTurnButton(width - 90, HUD_HEIGHT / 2);

    // Listen for turn events
    this._unsub = [];
    this._unsub.push(EventBus.on(EVENTS.TURN_STARTED, () => this.update()));
    this._unsub.push(EventBus.on(EVENTS.RESOURCE_CHANGED, () => this.update()));

    // Initial update
    this.update();
  }

  /**
   * Refresh HUD display with current game state.
   */
  update() {
    const player = GameState.getCurrentPlayer();
    if (!player) return;

    // Player indicator
    this._playerDot.clear();
    this._playerDot.fillStyle(player.color, 1);
    this._playerDot.fillCircle(14, HUD_HEIGHT / 2, 7);

    this._playerText.setText(player.name);
    this._playerText.setColor(player.isAI ? '#ff8888' : '#88bbff');

    // Turn
    this._turnText.setText(`Turn ${GameState.turnNumber}`);

    // Resources
    const res = player.resources || { wood: 0, stone: 0, food: 0, metal: 0 };
    this._resourceText.setText(
      `Wood: ${res.wood}  Stone: ${res.stone}  Food: ${res.food}  Metal: ${res.metal}`
    );
  }

  /**
   * Create the End Turn button.
   * @private
   */
  _createEndTurnButton(x, y) {
    const btnW = 100;
    const btnH = 30;

    this._endTurnBg = this.scene.add.graphics();
    this._endTurnBg.fillStyle(0x553333, 1);
    this._endTurnBg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
    this._endTurnBg.lineStyle(1, 0xcc6666, 1);
    this._endTurnBg.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);

    this._endTurnText = this.scene.add.text(x, y, 'End Turn', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#cc6666',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.scene.add.zone(x, y, btnW, btnH).setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      this._endTurnBg.clear();
      this._endTurnBg.fillStyle(0x664444, 1);
      this._endTurnBg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
      this._endTurnBg.lineStyle(1, 0xee8888, 1);
      this._endTurnBg.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
      this._endTurnText.setColor('#ee8888');
    });

    zone.on('pointerout', () => {
      this._endTurnBg.clear();
      this._endTurnBg.fillStyle(0x553333, 1);
      this._endTurnBg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
      this._endTurnBg.lineStyle(1, 0xcc6666, 1);
      this._endTurnBg.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 5);
      this._endTurnText.setColor('#cc6666');
    });

    zone.on('pointerdown', () => {
      // Get the GameScene's TurnManager
      const gameScene = this.scene.scene.get('GameScene');
      if (gameScene && gameScene.turnManager) {
        gameScene.turnManager.endTurn();
      }
    });
  }

  /**
   * Clean up listeners.
   */
  destroy() {
    this._unsub.forEach(fn => fn());
  }
}
