/**
 * @file HUDPanel.js
 * @description Top bar HUD showing player info, turn number, resources,
 * and the End Turn button.
 * @version 0.3.0
 */

import { GameState } from '../core/GameState.js';
import { EventBus, EVENTS } from '../core/EventBus.js';

const HUD_HEIGHT = 44;
const HUD_BG_COLOR = 0x1a1a2e;
const HUD_BG_ALPHA = 0.9;
const HUD_BORDER_COLOR = 0x333355;

export class HUDPanel {
  constructor(scene) {
    this.scene = scene;
    this.height = HUD_HEIGHT;
    this.width = scene.cameras.main.width;

    this._bg = scene.add.graphics();
    this._playerDot = scene.add.graphics();
    this._playerText = scene.add.text(30, HUD_HEIGHT / 2, '', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    this._turnText = scene.add.text(200, HUD_HEIGHT / 2, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa'
    }).setOrigin(0, 0.5);

    this._resourceText = scene.add.text(330, HUD_HEIGHT / 2, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#cccccc'
    }).setOrigin(0, 0.5);

    this._createEndTurnButton();

    this._unsub = [];
    this._unsub.push(EventBus.on(EVENTS.TURN_STARTED, () => this.update()));
    this._unsub.push(EventBus.on(EVENTS.RESOURCE_CHANGED, () => this.update()));

    this.layout(scene.cameras.main.width);
    this.update();
  }

  update() {
    const player = GameState.getCurrentPlayer();
    if (!player) return;

    this._playerDot.clear();
    this._playerDot.fillStyle(player.color, 1);
    this._playerDot.fillCircle(14, HUD_HEIGHT / 2, 7);

    this._playerText.setText(player.name);
    this._playerText.setColor(player.isAI ? '#ff8888' : '#88bbff');

    const modeLabel = player.isAI ? 'AI turn' : 'Player turn';
    this._turnText.setText(`Turn ${GameState.turnNumber} - ${modeLabel}`);

    const res = player.resources || { wood: 0, stone: 0, food: 0, metal: 0 };
    const income = player.income || { wood: 0, stone: 0, food: 0, metal: 0 };
    this._resourceText.setText(
      `Wood: ${res.wood} (+${income.wood})  Stone: ${res.stone} (+${income.stone})  Food: ${res.food} (+${income.food})  Metal: ${res.metal} (+${income.metal})`
    );
  }

  layout(width) {
    this.width = width;
    this._bg.clear();
    this._bg.fillStyle(HUD_BG_COLOR, HUD_BG_ALPHA);
    this._bg.fillRect(0, 0, width, HUD_HEIGHT);
    this._bg.lineStyle(1, HUD_BORDER_COLOR, 1);
    this._bg.lineBetween(0, HUD_HEIGHT, width, HUD_HEIGHT);

    this._playerText.setPosition(30, HUD_HEIGHT / 2);
    this._turnText.setPosition(200, HUD_HEIGHT / 2);
    this._resourceText.setPosition(Math.min(360, width * 0.28), HUD_HEIGHT / 2);
    this._layoutEndTurnButton(width - 84, HUD_HEIGHT / 2);
  }

  destroy() {
    this._unsub.forEach((fn) => fn());
    this._bg.destroy();
    this._playerDot.destroy();
    this._playerText.destroy();
    this._turnText.destroy();
    this._resourceText.destroy();
    this._endTurnBg.destroy();
    this._endTurnText.destroy();
    this._endTurnZone.destroy();
  }

  _createEndTurnButton() {
    this._endTurnWidth = 100;
    this._endTurnHeight = 30;
    this._endTurnHovered = false;

    this._endTurnBg = this.scene.add.graphics();
    this._endTurnText = this.scene.add.text(0, 0, 'End Turn', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#cc6666',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this._endTurnZone = this.scene.add.zone(0, 0, this._endTurnWidth, this._endTurnHeight).setInteractive({ useHandCursor: true });

    this._endTurnZone.on('pointerover', () => {
      this._endTurnHovered = true;
      this._endTurnText.setColor('#ee8888');
      this._drawEndTurnButton();
    });

    this._endTurnZone.on('pointerout', () => {
      this._endTurnHovered = false;
      this._endTurnText.setColor('#cc6666');
      this._drawEndTurnButton();
    });

    this._endTurnZone.on('pointerdown', () => {
      const gameScene = this.scene.scene.get('GameScene');
      if (gameScene?.turnManager) {
        gameScene.turnManager.endTurn();
      }
    });
  }

  _layoutEndTurnButton(x, y) {
    this._endTurnX = x;
    this._endTurnY = y;
    this._endTurnText.setPosition(x, y);
    this._endTurnZone.setPosition(x, y);
    this._endTurnZone.setSize(this._endTurnWidth, this._endTurnHeight);
    this._drawEndTurnButton();
  }

  _drawEndTurnButton() {
    const fill = this._endTurnHovered ? 0x664444 : 0x553333;
    const border = this._endTurnHovered ? 0xee8888 : 0xcc6666;

    this._endTurnBg.clear();
    this._endTurnBg.fillStyle(fill, 1);
    this._endTurnBg.fillRoundedRect(
      this._endTurnX - this._endTurnWidth / 2,
      this._endTurnY - this._endTurnHeight / 2,
      this._endTurnWidth,
      this._endTurnHeight,
      5
    );
    this._endTurnBg.lineStyle(1, border, 1);
    this._endTurnBg.strokeRoundedRect(
      this._endTurnX - this._endTurnWidth / 2,
      this._endTurnY - this._endTurnHeight / 2,
      this._endTurnWidth,
      this._endTurnHeight,
      5
    );
  }
}
