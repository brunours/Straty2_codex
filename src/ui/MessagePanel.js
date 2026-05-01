/**
 * @file MessagePanel.js
 * @description Small event log and controls reminder panel.
 */

import { GameState } from '../core/GameState.js';
import { EventBus, EVENTS } from '../core/EventBus.js';

const PANEL_WIDTH = 470;
const PANEL_HEIGHT = 108;

export class MessagePanel {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.cameras.main;
    this.x = width / 2 - PANEL_WIDTH / 2;
    this.y = height - PANEL_HEIGHT - 10;

    this._bg = scene.add.graphics();
    this._bg.fillStyle(0x0e1520, 0.9);
    this._bg.fillRoundedRect(this.x, this.y, PANEL_WIDTH, PANEL_HEIGHT, 8);
    this._bg.lineStyle(1, 0x334155, 1);
    this._bg.strokeRoundedRect(this.x, this.y, PANEL_WIDTH, PANEL_HEIGHT, 8);

    this._title = scene.add.text(this.x + 14, this.y + 10, 'Campaign Log', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#f4d67d',
      fontStyle: 'bold'
    });

    this._messages = scene.add.text(this.x + 14, this.y + 36, '', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#d6deea',
      lineSpacing: 4,
      wordWrap: { width: PANEL_WIDTH - 28 }
    });

    this._controls = scene.add.text(this.x + 14, this.y + PANEL_HEIGHT - 18, 'Controls: click to select, click terrain to move, click enemy to attack, End Turn to pass.', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#8ea0b7'
    });

    this._unsub = [];
    [EVENTS.GAME_MESSAGE, EVENTS.TURN_STARTED, EVENTS.VICTORY].forEach((eventName) => {
      this._unsub.push(EventBus.on(eventName, () => this.update()));
    });

    this.update();
  }

  update() {
    this._messages.setText((GameState.messageLog.slice(0, 4)).join('\n'));
  }

  destroy() {
    this._unsub.forEach((fn) => fn());
  }
}
