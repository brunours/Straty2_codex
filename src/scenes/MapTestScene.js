/**
 * @file MapTestScene.js
 * @description Temporary test scene for hex map generation and rendering.
 * Includes camera pan/zoom, hex selection, and debug info.
 * Will be replaced by GameScene in Phase 2.
 * @version 0.2.0
 */

import Phaser from 'phaser';
import { HexGrid } from '../core/HexGrid.js';
import { MapGenerator } from '../core/MapGenerator.js';
import { HexRenderer } from '../ui/HexRenderer.js';
import { MAP_SIZES, HEX_SIZE, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, PAN_SPEED } from '../config/constants.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';

export class MapTestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapTestScene' });
    this.hexMap = null;
    this.hexRenderer = null;
    this._cursors = null;
    this._wasd = null;
    this._debugText = null;
    this._needsRedraw = true;
  }

  create() {
    // Generate a medium map
    const { cols, rows } = MAP_SIZES.MEDIUM;
    console.log(`Generating ${cols}x${rows} map...`);
    const startTime = performance.now();
    this.hexMap = MapGenerator.generateValidated(cols, rows);
    const genTime = (performance.now() - startTime).toFixed(1);
    console.log(`Map generated in ${genTime}ms (${this.hexMap.size} hexes)`);

    // Create renderer
    this.hexRenderer = new HexRenderer(this, this.hexMap);

    // Set up camera bounds
    const worldBounds = this.hexMap.getWorldBounds();
    const padding = HEX_SIZE * 3;
    this.cameras.main.setBounds(
      worldBounds.left - padding,
      worldBounds.top - padding,
      worldBounds.width + padding * 2,
      worldBounds.height + padding * 2
    );

    // Center camera
    this.cameras.main.centerOn(worldBounds.centerX, worldBounds.centerY);

    // Input: keyboard
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Input: mouse wheel zoom
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.cameras.main;
      const newZoom = deltaY > 0
        ? Math.max(ZOOM_MIN, cam.zoom - ZOOM_STEP)
        : Math.min(ZOOM_MAX, cam.zoom + ZOOM_STEP);
      cam.setZoom(newZoom);
      this._needsRedraw = true;
    });

    // Input: click to select hex
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const { q, r } = HexGrid.pixelToAxial(worldX, worldY);
        const hex = this.hexMap.getHex(q, r);
        if (hex) {
          this.hexRenderer.setSelection(q, r);
          this._updateDebugText(hex);
        } else {
          this.hexRenderer.setSelection(null, null);
          this._updateDebugText(null);
        }
      }
    });

    // Debug text overlay (fixed to camera)
    this._debugText = this.add.text(10, 10, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(100);

    this._updateDebugText(null);

    // Instruction text
    this.add.text(10, this.cameras.main.height - 30, 'WASD/Arrows: Pan | Scroll: Zoom | Click: Select hex', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 }
    }).setScrollFactor(0).setDepth(100);

    // Initial render
    this.hexRenderer.render(this.cameras.main);
  }

  update() {
    const cam = this.cameras.main;
    const panSpeed = PAN_SPEED / cam.zoom;
    let moved = false;

    // Camera panning
    if (this._cursors.left.isDown || this._wasd.left.isDown) {
      cam.scrollX -= panSpeed;
      moved = true;
    }
    if (this._cursors.right.isDown || this._wasd.right.isDown) {
      cam.scrollX += panSpeed;
      moved = true;
    }
    if (this._cursors.up.isDown || this._wasd.up.isDown) {
      cam.scrollY -= panSpeed;
      moved = true;
    }
    if (this._cursors.down.isDown || this._wasd.down.isDown) {
      cam.scrollY += panSpeed;
      moved = true;
    }

    if (moved || this._needsRedraw) {
      this.hexRenderer.render(cam);
      this._needsRedraw = false;
    }
  }

  /**
   * Update the debug text with hex info.
   * @private
   * @param {Object|null} hex
   */
  _updateDebugText(hex) {
    if (!hex) {
      this._debugText.setText(
        `Straty2 v0.2.0 - Map Test\n` +
        `Map: ${this.hexMap.cols}x${this.hexMap.rows} (${this.hexMap.size} hexes)\n` +
        `Click a hex for details`
      );
      return;
    }

    const terrain = TERRAIN_CONFIG[hex.terrain];
    const lines = [
      `Hex (${hex.q}, ${hex.r})`,
      `Terrain: ${terrain.label}`,
      `Elevation: ${hex.elevation.toFixed(2)}`,
      `Moisture: ${hex.moisture.toFixed(2)}`,
      `Move Cost: ${terrain.moveCost === Infinity ? 'Impassable' : terrain.moveCost}`,
      `Defense: ${terrain.defenseBonus >= 0 ? '+' : ''}${terrain.defenseBonus}`,
      `River: ${hex.hasRiver ? 'Yes' : 'No'}`,
      `Resource: ${hex.hasResource ? hex.resourceType : 'None'}`
    ];
    this._debugText.setText(lines.join('\n'));
  }
}
