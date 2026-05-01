/**
 * @file HexRenderer.js
 * @description Renders hex tiles with terrain colors. Supports viewport culling
 * for performance on large maps and hex selection highlighting.
 * @version 0.2.0
 */

import { HexGrid } from '../core/HexGrid.js';
import { HEX_SIZE } from '../config/constants.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';
import { GameState } from '../core/GameState.js';
import { getCityLevel } from '../config/unitConfig.js';

/** River overlay color */
const RIVER_COLOR = 0x3399cc;
const RIVER_ALPHA = 0.6;

/** Selection highlight */
const SELECTION_COLOR = 0xffff00;
const SELECTION_ALPHA = 0.18;
const SELECTION_LINE_COLOR = 0xffff00;
const SELECTION_LINE_WIDTH = 3;

/** Hex border */
const HEX_BORDER_COLOR = 0x08111f;
const HEX_BORDER_ALPHA = 0.38;

const MOVE_RANGE_COLOR = 0x8dd5ff;
const MOVE_RANGE_ALPHA = 0.18;
const CITY_CENTER_COLOR = 0xf4e2a0;

export class HexRenderer {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {import('../core/HexMap.js').HexMap} hexMap - The hex map to render
   */
  constructor(scene, hexMap) {
    /** @type {Phaser.Scene} */
    this.scene = scene;
    /** @type {import('../core/HexMap.js').HexMap} */
    this.hexMap = hexMap;

    /** @type {Phaser.GameObjects.Graphics} Main hex graphics layer */
    this._hexGraphics = scene.add.graphics().setDepth(0);

    /** @type {Phaser.GameObjects.Graphics} River overlay layer */
    this._riverGraphics = scene.add.graphics().setDepth(1);

    /** @type {Phaser.GameObjects.Graphics} Selection highlight layer */
    this._selectionGraphics = scene.add.graphics().setDepth(6);

    /** @type {Phaser.GameObjects.Graphics} Resource indicator layer */
    this._resourceGraphics = scene.add.graphics().setDepth(2);

    /** @type {Phaser.GameObjects.Graphics} City layer */
    this._cityGraphics = scene.add.graphics().setDepth(4);

    /** @type {Phaser.GameObjects.Graphics} Unit layer */
    this._unitGraphics = scene.add.graphics().setDepth(5);

    /** @type {Phaser.GameObjects.Graphics} Reachable hex overlay layer */
    this._reachableGraphics = scene.add.graphics().setDepth(3);

    /** Currently selected hex */
    this._selectedHex = null;

    /** @type {Array<{q:number,r:number}>} */
    this._reachableHexes = [];

    this._unitLabels = [];
    this._cityLabels = [];

    /** Padding in hexes beyond viewport for smooth scrolling */
    this._cullPadding = 2;
  }

  /**
   * Render the entire visible map. Call on camera update.
   * @param {Phaser.Cameras.Scene2D.Camera} camera
   */
  render(camera) {
    camera.preRender();
    this._hexGraphics.clear();
    this._riverGraphics.clear();
    this._resourceGraphics.clear();
    this._cityGraphics.clear();
    this._unitGraphics.clear();
    this._reachableGraphics.clear();
    this._destroyLabels(this._unitLabels);
    this._destroyLabels(this._cityLabels);

    const view = this._getVisibleWorldRect(camera);

    this.hexMap.forEachHex((hex) => {
      const { x, y } = HexGrid.axialToPixel(hex.q, hex.r);
      if (!this._isWorldPointVisible(x, y, view)) {
        return;
      }

      const corners = HexGrid.getHexCorners(x, y);

      // Draw filled hex
      const terrainCfg = TERRAIN_CONFIG[hex.terrain];
      const color = terrainCfg ? terrainCfg.color : 0x000000;

      this._drawHexFilled(this._hexGraphics, corners, color);
      this._drawHexBorder(this._hexGraphics, corners);

      // Draw river overlay
      if (hex.hasRiver) {
        this._drawHexFilled(this._riverGraphics, corners, RIVER_COLOR, RIVER_ALPHA);
      }

      // Draw resource indicator (small diamond)
      if (hex.hasResource) {
        this._drawResourceIndicator(x, y, hex.resourceType);
      }

      if (hex.cityId) {
        const city = GameState.getCityAt(hex.q, hex.r);
        if (city) {
          this._drawCity(city, x, y);
        }
      }

      if (hex.unitId) {
        const unit = GameState.getUnitAt(hex.q, hex.r);
        if (unit) {
          this._drawUnit(unit, x, y);
        }
      }
    });

    this._drawReachableHexes(view);

    // Re-draw selection on top
    this._drawSelection();
  }

  /**
   * Set the selected hex and update highlight.
   * @param {number|null} q
   * @param {number|null} r
   */
  setSelection(q, r) {
    if (q === null || r === null) {
      this._selectedHex = null;
    } else {
      this._selectedHex = { q, r };
    }
    this._drawSelection();
  }

  /**
   * Get the currently selected hex.
   * @returns {{q: number, r: number}|null}
   */
  getSelection() {
    return this._selectedHex;
  }

  setReachableHexes(hexes) {
    this._reachableHexes = hexes || [];
  }

  /**
   * Draw selection highlight for the currently selected hex.
   * @private
   */
  _drawSelection() {
    this._selectionGraphics.clear();
    if (!this._selectedHex) return;

    const { x, y } = HexGrid.axialToPixel(this._selectedHex.q, this._selectedHex.r);
    const corners = HexGrid.getHexCorners(x, y);

    // Fill highlight
    this._selectionGraphics.fillStyle(SELECTION_COLOR, SELECTION_ALPHA);
    this._selectionGraphics.beginPath();
    this._selectionGraphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      this._selectionGraphics.lineTo(corners[i].x, corners[i].y);
    }
    this._selectionGraphics.closePath();
    this._selectionGraphics.fillPath();

    // Border highlight
    this._selectionGraphics.lineStyle(SELECTION_LINE_WIDTH, SELECTION_LINE_COLOR, 1);
    this._selectionGraphics.beginPath();
    this._selectionGraphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      this._selectionGraphics.lineTo(corners[i].x, corners[i].y);
    }
    this._selectionGraphics.closePath();
    this._selectionGraphics.strokePath();
  }

  _drawReachableHexes(view) {
    this._reachableHexes.forEach((hex) => {
      const { x, y } = HexGrid.axialToPixel(hex.q, hex.r);
      if (!this._isWorldPointVisible(x, y, view)) {
        return;
      }

      const corners = HexGrid.getHexCorners(x, y);
      this._drawHexFilled(this._reachableGraphics, corners, MOVE_RANGE_COLOR, MOVE_RANGE_ALPHA);
    });
  }

  /**
   * Draw a filled hex polygon.
   * @private
   */
  _drawHexFilled(graphics, corners, color, alpha = 1) {
    graphics.fillStyle(color, alpha);
    graphics.beginPath();
    graphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      graphics.lineTo(corners[i].x, corners[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
  }

  /**
   * Draw hex border lines.
   * @private
   */
  _drawHexBorder(graphics, corners) {
    graphics.lineStyle(1, HEX_BORDER_COLOR, HEX_BORDER_ALPHA);
    graphics.beginPath();
    graphics.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      graphics.lineTo(corners[i].x, corners[i].y);
    }
    graphics.closePath();
    graphics.strokePath();
  }

  /**
   * Draw a small resource indicator on the hex.
   * @private
   */
  _drawResourceIndicator(cx, cy, resourceType) {
    const colors = {
      food: 0x44cc44,
      wood: 0x886622,
      stone: 0xaaaaaa,
      metal: 0xccaa33
    };
    const color = colors[resourceType] || 0xffffff;
    const size = 4;

    this._resourceGraphics.fillStyle(color, 0.8);
    this._resourceGraphics.fillCircle(cx, cy + HEX_SIZE * 0.4, size);
  }

  _drawCity(city, cx, cy) {
    const owner = GameState.getPlayer(city.playerIndex);
    const size = HEX_SIZE * 0.38;
    this._cityGraphics.fillStyle(owner?.color ?? CITY_CENTER_COLOR, 0.95);
    this._cityGraphics.beginPath();
    this._cityGraphics.moveTo(cx, cy - size);
    this._cityGraphics.lineTo(cx + size, cy);
    this._cityGraphics.lineTo(cx, cy + size);
    this._cityGraphics.lineTo(cx - size, cy);
    this._cityGraphics.closePath();
    this._cityGraphics.fillPath();
    this._cityGraphics.lineStyle(2, CITY_CENTER_COLOR, 0.95);
    this._cityGraphics.strokePath();

    const level = getCityLevel(city.level);
    const label = this.scene.add.text(cx, cy - 3, `${city.population}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#0b1020',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(4);
    const subLabel = this.scene.add.text(cx, cy + 17, level.label[0], {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#f8e9b5',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(4);
    this._cityLabels.push(label, subLabel);
  }

  _drawUnit(unit, cx, cy) {
    const owner = GameState.getPlayer(unit.playerIndex);
    const radius = HEX_SIZE * 0.28;
    const activePlayer = unit.playerIndex === GameState.currentPlayerIndex;
    this._unitGraphics.fillStyle(owner?.color ?? 0xffffff, 1);
    this._unitGraphics.fillCircle(cx, cy, radius + (activePlayer ? 3 : 0));
    this._unitGraphics.fillStyle(0x0b1220, 0.95);
    this._unitGraphics.fillCircle(cx, cy, radius - 3);
    this._unitGraphics.lineStyle(2, activePlayer ? 0xf4e2a0 : 0xd5d9e5, 1);
    this._unitGraphics.strokeCircle(cx, cy, radius + (activePlayer ? 3 : 0));

    const label = this.scene.add.text(cx, cy - 1, unit.symbol, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
    const hp = this.scene.add.text(cx, cy + 15, `${Math.max(0, unit.hp)}`, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#d2fca2',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(5);
    this._unitLabels.push(label, hp);
  }

  /**
   * Calculate which hex range is visible in the current camera viewport.
   * @private
   * @param {Phaser.Cameras.Scene2D.Camera} camera
   * @returns {{minQ: number, maxQ: number, minR: number, maxR: number}}
   */
  _getVisibleWorldRect(camera) {
    const horizontalPad = HEX_SIZE * (1 + this._cullPadding);
    const verticalPad = Math.sqrt(3) * HEX_SIZE / 2 * (1 + this._cullPadding);

    return {
      left: camera.worldView.x - horizontalPad,
      right: camera.worldView.x + camera.worldView.width + horizontalPad,
      top: camera.worldView.y - verticalPad,
      bottom: camera.worldView.y + camera.worldView.height + verticalPad
    };
  }

  _isWorldPointVisible(x, y, view) {
    return x >= view.left && x <= view.right && y >= view.top && y <= view.bottom;
  }

  /**
   * Clean up all graphics objects.
   */
  destroy() {
    this._destroyLabels(this._unitLabels);
    this._destroyLabels(this._cityLabels);
    this._hexGraphics.destroy();
    this._riverGraphics.destroy();
    this._selectionGraphics.destroy();
    this._resourceGraphics.destroy();
    this._cityGraphics.destroy();
    this._unitGraphics.destroy();
    this._reachableGraphics.destroy();
  }

  _destroyLabels(labels) {
    labels.forEach((label) => label.destroy());
    labels.length = 0;
  }
}
