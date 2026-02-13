/**
 * @file GameScene.js
 * @description Primary gameplay scene. Orchestrates map generation, rendering,
 * camera controls, hex selection, and turn management. Launches UIScene as
 * a parallel overlay.
 * @version 0.3.0
 */

import Phaser from 'phaser';
import { HexGrid } from '../core/HexGrid.js';
import { MapGenerator } from '../core/MapGenerator.js';
import { HexRenderer } from '../ui/HexRenderer.js';
import { GameState } from '../core/GameState.js';
import { TurnManager } from '../core/TurnManager.js';
import { EventBus, EVENTS } from '../core/EventBus.js';
import { MAP_SIZES, HEX_SIZE, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, PAN_SPEED } from '../config/constants.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.hexRenderer = null;
    this.turnManager = null;
    this._cursors = null;
    this._wasd = null;
    this._needsRedraw = true;
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
  }

  create() {
    // Generate map based on settings
    const mapSizeKey = GameState.settings.mapSize || 'MEDIUM';
    const { cols, rows } = MAP_SIZES[mapSizeKey];

    console.log(`Generating ${cols}x${rows} map...`);
    const startTime = performance.now();
    GameState.hexMap = MapGenerator.generateValidated(cols, rows);
    const genTime = (performance.now() - startTime).toFixed(1);
    console.log(`Map generated in ${genTime}ms (${GameState.hexMap.size} hexes)`);

    // Create hex renderer
    this.hexRenderer = new HexRenderer(this, GameState.hexMap);

    // Set up camera bounds
    const bottomRight = HexGrid.axialToPixel(cols, rows);
    const padding = HEX_SIZE * 4;
    this.cameras.main.setBounds(
      -padding, -padding,
      bottomRight.x + padding * 2,
      bottomRight.y + padding * 2
    );

    // Center camera on map
    const center = HexGrid.axialToPixel(Math.floor(cols / 2), Math.floor(rows / 2));
    this.cameras.main.centerOn(center.x, center.y);

    // Keyboard input for camera panning
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Mouse wheel zoom
    this.input.on('wheel', (_pointer, _gameObjects, _deltaX, deltaY) => {
      const cam = this.cameras.main;
      const newZoom = deltaY > 0
        ? Math.max(ZOOM_MIN, cam.zoom - ZOOM_STEP)
        : Math.min(ZOOM_MAX, cam.zoom + ZOOM_STEP);
      cam.setZoom(newZoom);
      this._needsRedraw = true;
    });

    // Middle-mouse drag pan
    this.input.on('pointerdown', (pointer) => {
      if (pointer.middleButtonDown()) {
        this._isDragging = true;
        this._dragStartX = pointer.x;
        this._dragStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this._isDragging) {
        const cam = this.cameras.main;
        cam.scrollX -= (pointer.x - this._dragStartX) / cam.zoom;
        cam.scrollY -= (pointer.y - this._dragStartY) / cam.zoom;
        this._dragStartX = pointer.x;
        this._dragStartY = pointer.y;
        this._needsRedraw = true;
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.middleButtonReleased()) {
        this._isDragging = false;
      }
    });

    // Left-click hex selection
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        const { q, r } = HexGrid.pixelToAxial(pointer.worldX, pointer.worldY);
        this._handleHexClick(q, r);
      }
    });

    // Escape key to deselect
    this.input.keyboard.on('keydown-ESC', () => {
      this._clearSelection();
    });

    // Launch UIScene as parallel overlay
    this.scene.launch('UIScene');

    // Initialize turn manager and start the game
    this.turnManager = new TurnManager();
    this.turnManager.startGame();

    // Initial render
    this.hexRenderer.render(this.cameras.main);

    // Listen for game events
    this._setupEventListeners();
  }

  update() {
    const cam = this.cameras.main;
    const panSpeed = PAN_SPEED / cam.zoom;
    let moved = false;

    // Camera panning via keyboard
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
   * Handle a hex being clicked.
   * @private
   * @param {number} q
   * @param {number} r
   */
  _handleHexClick(q, r) {
    const hex = GameState.hexMap.getHex(q, r);
    if (!hex) {
      this._clearSelection();
      return;
    }

    // Check for unit at hex
    const unit = GameState.getUnitAt(q, r);
    if (unit) {
      GameState.selectionType = 'unit';
      GameState.selectionData = unit;
      this.hexRenderer.setSelection(q, r);
      EventBus.emit(EVENTS.UNIT_SELECTED, { unit, hex });
      return;
    }

    // Check for city at hex
    const city = GameState.getCityAt(q, r);
    if (city) {
      GameState.selectionType = 'city';
      GameState.selectionData = city;
      this.hexRenderer.setSelection(q, r);
      EventBus.emit(EVENTS.CITY_SELECTED, { city, hex });
      return;
    }

    // Select the hex itself
    GameState.selectionType = 'hex';
    GameState.selectionData = hex;
    this.hexRenderer.setSelection(q, r);
    EventBus.emit(EVENTS.HEX_SELECTED, { hex });
  }

  /**
   * Clear the current selection.
   * @private
   */
  _clearSelection() {
    GameState.selectionType = null;
    GameState.selectionData = null;
    this.hexRenderer.setSelection(null, null);
    EventBus.emit(EVENTS.SELECTION_CLEARED);
  }

  /**
   * Set up listeners for game events.
   * @private
   */
  _setupEventListeners() {
    EventBus.on(EVENTS.UNIT_MOVED, () => {
      this._needsRedraw = true;
    });

    EventBus.on(EVENTS.CITY_FOUNDED, () => {
      this._needsRedraw = true;
    });

    EventBus.on(EVENTS.COMBAT_RESOLVED, () => {
      this._needsRedraw = true;
    });

    EventBus.on(EVENTS.FOG_UPDATED, () => {
      this._needsRedraw = true;
    });
  }

  /**
   * Center camera on a hex coordinate.
   * @param {number} q
   * @param {number} r
   */
  centerOnHex(q, r) {
    const { x, y } = HexGrid.axialToPixel(q, r);
    this.cameras.main.centerOn(x, y);
    this._needsRedraw = true;
  }

  /**
   * Clean up when leaving the scene.
   */
  shutdown() {
    EventBus.clear();
    if (this.hexRenderer) this.hexRenderer.destroy();
    this.scene.stop('UIScene');
  }
}
