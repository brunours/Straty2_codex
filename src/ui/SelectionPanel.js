/**
 * @file SelectionPanel.js
 * @description Bottom-left panel showing info about the currently selected
 * hex, unit, or city.
 * @version 0.3.0
 */

import { GameState } from '../core/GameState.js';
import { EventBus, EVENTS } from '../core/EventBus.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';

const PANEL_WIDTH = 240;
const PANEL_HEIGHT = 160;
const PANEL_MARGIN = 10;
const PANEL_BG = 0x1a1a2e;
const PANEL_ALPHA = 0.88;
const PANEL_BORDER = 0x444466;

export class SelectionPanel {
  /**
   * @param {Phaser.Scene} scene - The UIScene
   */
  constructor(scene) {
    this.scene = scene;
    const { height } = scene.cameras.main;

    const x = PANEL_MARGIN;
    const y = height - PANEL_HEIGHT - PANEL_MARGIN;

    // Background
    this._bg = scene.add.graphics();
    this._bg.fillStyle(PANEL_BG, PANEL_ALPHA);
    this._bg.fillRoundedRect(x, y, PANEL_WIDTH, PANEL_HEIGHT, 6);
    this._bg.lineStyle(1, PANEL_BORDER, 1);
    this._bg.strokeRoundedRect(x, y, PANEL_WIDTH, PANEL_HEIGHT, 6);

    // Title
    this._titleText = scene.add.text(x + 12, y + 10, 'No Selection', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#c4a44a',
      fontStyle: 'bold'
    });

    // Info text
    this._infoText = scene.add.text(x + 12, y + 34, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#cccccc',
      lineSpacing: 4,
      wordWrap: { width: PANEL_WIDTH - 24 }
    });

    // Listen for selection events
    this._unsub = [];
    this._unsub.push(EventBus.on(EVENTS.HEX_SELECTED, (data) => this._showHexInfo(data.hex)));
    this._unsub.push(EventBus.on(EVENTS.UNIT_SELECTED, (data) => this._showUnitInfo(data.unit, data.hex)));
    this._unsub.push(EventBus.on(EVENTS.CITY_SELECTED, (data) => this._showCityInfo(data.city, data.hex)));
    this._unsub.push(EventBus.on(EVENTS.SELECTION_CLEARED, () => this._clearInfo()));
  }

  /**
   * Show hex terrain info.
   * @private
   */
  _showHexInfo(hex) {
    const terrain = TERRAIN_CONFIG[hex.terrain];
    this._titleText.setText(`Hex (${hex.q}, ${hex.r})`);

    const lines = [
      `Terrain: ${terrain.label}`,
      `Move Cost: ${terrain.moveCost === Infinity ? 'Impassable' : terrain.moveCost}`,
      `Defense: ${terrain.defenseBonus >= 0 ? '+' : ''}${terrain.defenseBonus}`
    ];

    if (hex.hasRiver) lines.push('River: Yes');
    if (hex.hasResource) lines.push(`Resource: ${hex.resourceType}`);

    this._infoText.setText(lines.join('\n'));
  }

  /**
   * Show unit info.
   * @private
   */
  _showUnitInfo(unit, hex) {
    const owner = GameState.getPlayer(unit.playerIndex);
    const ownerName = owner ? owner.name : 'Unknown';

    this._titleText.setText(`${unit.type || 'Unit'} (${ownerName})`);

    const lines = [
      `HP: ${unit.hp}/${unit.maxHp}`,
      `Atk: ${unit.attack}  Def: ${unit.defense}`,
      `Move: ${unit.movementRemaining}/${unit.movement}`,
      `Vision: ${unit.visionRange || 2}`,
      `Pos: (${unit.q}, ${unit.r})`
    ];

    if (unit.range && unit.range > 1) {
      lines.splice(2, 0, `Range: ${unit.range}`);
    }

    this._infoText.setText(lines.join('\n'));
  }

  /**
   * Show city info.
   * @private
   */
  _showCityInfo(city, hex) {
    const owner = GameState.getPlayer(city.playerIndex);
    const ownerName = owner ? owner.name : 'Unknown';
    const levels = ['Camp', 'Village', 'Town', 'City'];

    this._titleText.setText(`${city.name || 'City'} (${ownerName})`);

    const lines = [
      `Level: ${levels[city.level] || 'Camp'}`,
      `Population: ${city.population || 0}`,
      `Pos: (${city.q}, ${city.r})`
    ];

    this._infoText.setText(lines.join('\n'));
  }

  /**
   * Clear the panel.
   * @private
   */
  _clearInfo() {
    this._titleText.setText('No Selection');
    this._infoText.setText('Click a hex, unit, or\ncity for details.');
  }

  /**
   * Clean up listeners.
   */
  destroy() {
    this._unsub.forEach(fn => fn());
  }
}
