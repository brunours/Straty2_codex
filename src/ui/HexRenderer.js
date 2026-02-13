/**
 * @file HexRenderer.js
 * @description Renders hex tiles with terrain colors. Supports viewport culling
 * for performance on large maps and hex selection highlighting.
 * @version 0.2.0
 */

import { HexGrid } from '../core/HexGrid.js';
import { HEX_SIZE } from '../config/constants.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';

/** River overlay color */
const RIVER_COLOR = 0x3399cc;
const RIVER_ALPHA = 0.6;

/** Selection highlight */
const SELECTION_COLOR = 0xffff00;
const SELECTION_ALPHA = 0.4;
const SELECTION_LINE_COLOR = 0xffff00;
const SELECTION_LINE_WIDTH = 2;

/** Hex border */
const HEX_BORDER_COLOR = 0x000000;
const HEX_BORDER_ALPHA = 0.15;

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
    this._hexGraphics = scene.add.graphics();

    /** @type {Phaser.GameObjects.Graphics} River overlay layer */
    this._riverGraphics = scene.add.graphics();

    /** @type {Phaser.GameObjects.Graphics} Selection highlight layer */
    this._selectionGraphics = scene.add.graphics();

    /** @type {Phaser.GameObjects.Graphics} Resource indicator layer */
    this._resourceGraphics = scene.add.graphics();

    /** Currently selected hex */
    this._selectedHex = null;

    /** Padding in hexes beyond viewport for smooth scrolling */
    this._cullPadding = 2;
  }

  /**
   * Render the entire visible map. Call on camera update.
   * @param {Phaser.Cameras.Scene2D.Camera} camera
   */
  render(camera) {
    this._hexGraphics.clear();
    this._riverGraphics.clear();
    this._resourceGraphics.clear();

    // Calculate visible hex range from camera bounds
    const bounds = this._getVisibleBounds(camera);

    this.hexMap.forEachHex((hex) => {
      // Viewport culling
      if (hex.q < bounds.minQ || hex.q > bounds.maxQ ||
          hex.r < bounds.minR || hex.r > bounds.maxR) {
        return;
      }

      const { x, y } = HexGrid.axialToPixel(hex.q, hex.r);
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
    });

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

  /**
   * Calculate which hex range is visible in the current camera viewport.
   * @private
   * @param {Phaser.Cameras.Scene2D.Camera} camera
   * @returns {{minQ: number, maxQ: number, minR: number, maxR: number}}
   */
  _getVisibleBounds(camera) {
    const pad = this._cullPadding;

    // Camera world bounds
    const left = camera.worldView.x;
    const right = left + camera.worldView.width;
    const top = camera.worldView.y;
    const bottom = top + camera.worldView.height;

    // Convert corners to axial coords
    const topLeft = HexGrid.pixelToAxial(left, top);
    const bottomRight = HexGrid.pixelToAxial(right, bottom);

    return {
      minQ: Math.max(0, topLeft.q - pad),
      maxQ: Math.min(this.hexMap.cols - 1, bottomRight.q + pad),
      minR: Math.max(0, topLeft.r - pad),
      maxR: Math.min(this.hexMap.rows - 1, bottomRight.r + pad)
    };
  }

  /**
   * Clean up all graphics objects.
   */
  destroy() {
    this._hexGraphics.destroy();
    this._riverGraphics.destroy();
    this._selectionGraphics.destroy();
    this._resourceGraphics.destroy();
  }
}
