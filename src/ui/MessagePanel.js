/**
 * @file MessagePanel.js
 * @description Small event log and controls reminder panel.
 */

import { GameState } from '../core/GameState.js';
import { EventBus, EVENTS } from '../core/EventBus.js';

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 220;

export class MessagePanel {
  constructor(scene) {
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.width = PANEL_WIDTH;
    this.height = PANEL_HEIGHT;
    this.visible = true;

    this._bg = scene.add.graphics();
    this._title = scene.add.text(0, 0, 'Campaign Log', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#f4d67d',
      fontStyle: 'bold'
    });

    this._messages = scene.add.text(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#d6deea',
      lineSpacing: 4,
      wordWrap: { width: PANEL_WIDTH - 28 }
    });

    this._controls = scene.add.text(0, 0, 'Controls: left click selects, right-drag pans, wheel zooms, End Turn passes.', {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#8ea0b7',
      wordWrap: { width: PANEL_WIDTH - 28 }
    });

    this._unsub = [];
    [EVENTS.GAME_MESSAGE, EVENTS.TURN_STARTED, EVENTS.VICTORY].forEach((eventName) => {
      this._unsub.push(EventBus.on(eventName, () => this.update()));
    });

    this.layout({ x: 0, y: 0, width: PANEL_WIDTH, height: PANEL_HEIGHT });
    this.update();
  }

  layout({ x, y, width, height }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this._bg.clear();
    this._bg.fillStyle(0x0e1520, 0.9);
    this._bg.fillRoundedRect(x, y, width, height, 8);
    this._bg.lineStyle(1, 0x334155, 1);
    this._bg.strokeRoundedRect(x, y, width, height, 8);

    this._title.setPosition(x + 14, y + 10);
    this._messages.setPosition(x + 14, y + 38);
    this._messages.setWordWrapWidth(width - 28);
    this._controls.setPosition(x + 14, y + height - 34);
    this._controls.setWordWrapWidth(width - 28);
  }

  setVisible(visible) {
    this.visible = visible;
    [this._bg, this._title, this._messages, this._controls].forEach((item) => item.setVisible(visible));
  }

  update() {
    if (!this.visible) {
      return;
    }

    this._messages.setText((GameState.messageLog.slice(0, 4)).join('\n'));
  }

  destroy() {
    this._unsub.forEach((fn) => fn());
    this._bg.destroy();
    this._title.destroy();
    this._messages.destroy();
    this._controls.destroy();
  }
}
