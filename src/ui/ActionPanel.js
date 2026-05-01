/**
 * @file ActionPanel.js
 * @description Context-sensitive command panel for selected units and cities.
 */

import { GameState } from '../core/GameState.js';
import { EventBus, EVENTS } from '../core/EventBus.js';
import { getCityLevel, getUnitConfig } from '../config/unitConfig.js';

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 300;
const PANEL_BG = 0x101827;
const PANEL_BORDER = 0x41516b;

export class ActionPanel {
  constructor(scene) {
    this.scene = scene;
    this.x = 0;
    this.y = 0;
    this.width = PANEL_WIDTH;
    this.height = PANEL_HEIGHT;
    this.visible = true;
    this._buttons = [];

    this._bg = scene.add.graphics();
    this._title = scene.add.text(0, 0, 'Command Panel', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#f4d67d',
      fontStyle: 'bold'
    });

    this._subtitle = scene.add.text(0, 0, '', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#b8c6d9',
      wordWrap: { width: PANEL_WIDTH - 28 }
    });

    this._queueText = scene.add.text(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#94a6bd',
      wordWrap: { width: PANEL_WIDTH - 28 }
    });

    this._unsub = [];
    [
      EVENTS.HEX_SELECTED,
      EVENTS.UNIT_SELECTED,
      EVENTS.CITY_SELECTED,
      EVENTS.SELECTION_CLEARED,
      EVENTS.TURN_STARTED,
      EVENTS.CITY_FOUNDED,
      EVENTS.CITY_CAPTURED,
      EVENTS.CITY_PRODUCTION_STARTED,
      EVENTS.CITY_PRODUCTION_COMPLETED,
      EVENTS.RESOURCE_CHANGED,
      EVENTS.VICTORY
    ].forEach((eventName) => {
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
    this._bg.fillStyle(PANEL_BG, 0.94);
    this._bg.fillRoundedRect(x, y, width, height, 8);
    this._bg.lineStyle(1, PANEL_BORDER, 1);
    this._bg.strokeRoundedRect(x, y, width, height, 8);

    this._title.setPosition(x + 14, y + 12);
    this._subtitle.setPosition(x + 14, y + 44);
    this._subtitle.setWordWrapWidth(width - 28);
    this._queueText.setPosition(x + 14, y + 120);
    this._queueText.setWordWrapWidth(width - 28);
    this.update();
  }

  setVisible(visible) {
    this.visible = visible;
    [this._bg, this._title, this._subtitle, this._queueText, ...this._buttons].forEach((item) => {
      item?.setVisible?.(visible);
    });

    if (!visible) {
      this._clearButtons();
    } else {
      this.update();
    }
  }

  update() {
    this._clearButtons();
    if (!this.visible) {
      return;
    }

    const gameScene = this.scene.scene.get('GameScene');
    if (!gameScene) {
      return;
    }

    if (GameState.winnerIndex !== null) {
      this._subtitle.setText('The match is over. Start a new skirmish from the main menu to play again.');
      this._queueText.setText('');
      return;
    }

    if (GameState.selectionType === 'unit') {
      const unit = GameState.selectionData;
      const owner = GameState.getPlayer(unit.playerIndex);
      const config = getUnitConfig(unit.type);
      this._subtitle.setText(
        `${owner.name}'s ${config.label}\nClick a hex to move. Click an enemy to attack.\nRange ${unit.range} - Move ${unit.movementRemaining}/${unit.movement}`
      );
      this._queueText.setText(
        unit.canFoundCity
          ? 'Settlers may found cities on empty land at least 2 hexes from your existing cities.'
          : 'Military units can capture an undefended enemy city by entering it.'
      );
      this._renderButtons(gameScene.getSelectionActions());
      return;
    }

    if (GameState.selectionType === 'city') {
      const city = GameState.selectionData;
      const owner = GameState.getPlayer(city.playerIndex);
      const level = getCityLevel(city.level);
      this._subtitle.setText(
        `${owner.name}'s ${city.name}\n${level.label} - Population ${city.population}\nTerritory radius ${level.radius}`
      );
      this._queueText.setText(
        city.production
          ? `Producing ${getUnitConfig(city.production.unitType).label} - ${city.production.turnsRemaining} turn(s) left`
          : 'Select a unit below to begin production.'
      );
      this._renderButtons(gameScene.getSelectionActions());
      return;
    }

    this._subtitle.setText(
      'Select a unit or city to issue orders.\nUse WASD or arrow keys to pan, right-drag to move the camera, mouse wheel to zoom, and End Turn when you are done.'
    );
    this._queueText.setText(
      'Core loop: expand with settlers, gather city income each turn, train troops, and capture every rival city.'
    );
  }

  destroy() {
    this._clearButtons();
    this._unsub.forEach((fn) => fn());
    this._bg.destroy();
    this._title.destroy();
    this._subtitle.destroy();
    this._queueText.destroy();
  }

  _renderButtons(actions) {
    const startY = this.y + Math.max(156, this.height - 160);
    const buttonHeight = 42;
    const buttonGap = 10;

    actions.slice(0, 4).forEach((action, index) => {
      const y = startY + index * (buttonHeight + buttonGap);
      const width = this.width - 28;

      const bg = this.scene.add.graphics();
      bg.fillStyle(action.disabled ? 0x243043 : 0x29415d, 1);
      bg.fillRoundedRect(this.x + 14, y, width, buttonHeight, 6);
      bg.lineStyle(1, action.disabled ? 0x40546f : 0x7db7e6, 1);
      bg.strokeRoundedRect(this.x + 14, y, width, buttonHeight, 6);

      const text = this.scene.add.text(this.x + 22, y + 6, action.label, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: action.disabled ? '#8ca0b9' : '#ecf6ff',
        fontStyle: 'bold'
      });

      const detail = this.scene.add.text(this.x + 22, y + 22, action.detail, {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#bfd3ea',
        wordWrap: { width: width - 32 }
      });

      const zone = this.scene.add.zone(this.x + 14 + width / 2, y + buttonHeight / 2, width, buttonHeight).setInteractive({ useHandCursor: !action.disabled });
      if (!action.disabled) {
        zone.on('pointerdown', () => {
          const gameScene = this.scene.scene.get('GameScene');
          gameScene?.performAction(action.id);
        });
      }

      this._buttons.push(bg, text, detail, zone);
    });
  }

  _clearButtons() {
    this._buttons.forEach((item) => item.destroy());
    this._buttons.length = 0;
  }
}
