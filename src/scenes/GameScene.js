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
import { GameplayCore } from '../core/GameplayCore.js';
import { EventBus, EVENTS } from '../core/EventBus.js';
import { FOG_MODE, MAP_SIZES, HEX_SIZE, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, PAN_SPEED } from '../config/constants.js';

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
    this._aiTurnPending = false;
    this._victoryOverlay = null;
    this._viewportOverlayOffsetX = 0;
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

    GameplayCore.initializeMatch();

    // Create hex renderer
    this.hexRenderer = new HexRenderer(this, GameState.hexMap);

    // Set up camera bounds
    const worldBounds = GameState.hexMap.getWorldBounds();
    const padding = HEX_SIZE * 3;
    this.cameras.main.setBounds(
      worldBounds.left - padding,
      worldBounds.top - padding,
      worldBounds.width + padding * 2,
      worldBounds.height + padding * 2
    );

    // Center camera on map
    this.cameras.main.centerOn(worldBounds.centerX, worldBounds.centerY);

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

    this.input.mouse?.disableContextMenu();

    // Right-mouse drag pan
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) {
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
      if (pointer.rightButtonReleased()) {
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

    this.scale.on('resize', () => {
      this._needsRedraw = true;
    });

    // Launch UIScene as parallel overlay
    this.scene.launch('UIScene');

    // Listen for game events
    this._setupEventListeners();

    // Initialize turn manager and start the game
    this.turnManager = new TurnManager();
    this.turnManager.startGame();
    const centerOnTurnStart = GameState.settings.fogMode !== FOG_MODE.NONE;
    this._focusOnCurrentPlayer(centerOnTurnStart);
    if (!centerOnTurnStart) {
      this._frameMap();
    }

    // Initial render
    this._syncSelectionState();
    this.hexRenderer.render(this.cameras.main);
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

    const unit = GameState.getUnitAt(q, r);
    const city = GameState.getCityAt(q, r);
    const selectedUnit = GameState.selectionType === 'unit' ? GameState.selectionData : null;
    const isPlayerTurnUnit = selectedUnit && selectedUnit.playerIndex === GameState.currentPlayerIndex;

    if (GameState.winnerIndex !== null) {
      if (unit) {
        this._selectUnit(unit, hex);
      } else if (city) {
        this._selectCity(city, hex);
      } else {
        this._selectHex(hex);
      }
      return;
    }

    if (selectedUnit && isPlayerTurnUnit && unit && unit.playerIndex !== selectedUnit.playerIndex) {
      const result = GameplayCore.attackUnit(selectedUnit, unit);
      if (!result.ok) {
        GameplayCore.pushMessage(result.reason);
      }
      this._syncSelectionState();
      return;
    }

    if (selectedUnit && isPlayerTurnUnit && (!unit || unit.id === selectedUnit.id)) {
      const result = GameplayCore.moveUnit(selectedUnit, q, r);
      if (result.ok) {
        const movedUnit = GameState.units.get(selectedUnit.id);
        if (movedUnit) {
          const movedHex = GameState.hexMap.getHex(movedUnit.q, movedUnit.r);
          this._selectUnit(movedUnit, movedHex);
        } else {
          this._clearSelection();
        }
      } else if (unit && unit.id === selectedUnit.id) {
        this._selectUnit(unit, hex);
      } else if (city && city.playerIndex === GameState.currentPlayerIndex) {
        this._selectCity(city, hex);
      } else {
        GameplayCore.pushMessage(result.reason);
        this._selectHex(hex);
      }
      this._syncSelectionState();
      return;
    }

    if (unit) {
      this._selectUnit(unit, hex);
      return;
    }

    if (city) {
      this._selectCity(city, hex);
      return;
    }

    this._selectHex(hex);
  }

  /**
   * Clear the current selection.
   * @private
   */
  _clearSelection() {
    GameState.selectionType = null;
    GameState.selectionData = null;
    this.hexRenderer.setSelection(null, null);
    this.hexRenderer.setReachableHexes([]);
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

    EventBus.on(EVENTS.UNIT_CREATED, () => {
      this._needsRedraw = true;
    });

    EventBus.on(EVENTS.UNIT_DESTROYED, ({ unit }) => {
      if (GameState.selectionData?.id === unit.id) {
        this._clearSelection();
      }
      this._needsRedraw = true;
    });

    EventBus.on(EVENTS.CITY_FOUNDED, () => {
      this._needsRedraw = true;
      this._syncSelectionState();
    });

    EventBus.on(EVENTS.COMBAT_RESOLVED, () => {
      this._needsRedraw = true;
      this._syncSelectionState();
    });

    EventBus.on(EVENTS.FOG_UPDATED, () => {
      this._needsRedraw = true;
    });

    EventBus.on(EVENTS.CITY_CAPTURED, () => {
      this._needsRedraw = true;
      this._syncSelectionState();
    });

    EventBus.on(EVENTS.CITY_PRODUCTION_COMPLETED, () => {
      this._needsRedraw = true;
    });

    EventBus.on(EVENTS.TURN_STARTED, ({ isAI, playerName }) => {
      this._focusOnCurrentPlayer(GameState.settings.fogMode !== FOG_MODE.NONE);
      this._syncSelectionState();
      if (isAI && GameState.winnerIndex === null) {
        this._queueAITurn(playerName);
      } else {
        GameplayCore.pushMessage(`${playerName} begins turn ${GameState.turnNumber}.`);
      }
    });

    EventBus.on(EVENTS.VICTORY, ({ player }) => {
      this._showVictoryOverlay(player.name);
    });
  }

  /**
   * Center camera on a hex coordinate.
   * @param {number} q
   * @param {number} r
   */
  centerOnHex(q, r) {
    const { x, y } = HexGrid.axialToPixel(q, r);
    this.centerOnWorld(x, y);
  }

  centerOnWorld(x, y) {
    const adjustedX = x - this._viewportOverlayOffsetX / this.cameras.main.zoom;
    this.cameras.main.centerOn(adjustedX, y);
    this._needsRedraw = true;
  }

  setViewportOverlayOffset(offsetX = 0) {
    const cam = this.cameras.main;
    const delta = offsetX - this._viewportOverlayOffsetX;
    if (delta === 0) {
      return;
    }

    this._viewportOverlayOffsetX = offsetX;
    cam.scrollX -= delta / cam.zoom;
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

  getSelectionActions() {
    if (GameState.selectionType === 'unit') {
      const unit = GameState.selectionData;
      if (unit.playerIndex === GameState.currentPlayerIndex && GameplayCore.canFoundCity(unit)) {
        return [
          {
            id: 'found-city',
            label: 'Found City',
            detail: 'Consume settler and create a new camp',
            disabled: false
          }
        ];
      }
      return [];
    }

    if (GameState.selectionType === 'city') {
      const city = GameState.selectionData;
      if (city.playerIndex !== GameState.currentPlayerIndex) {
        return [];
      }

      return GameplayCore.getProductionOptions(city).map((option) => ({
        id: `produce:${option.type}`,
        label: option.label,
        detail: `Cost F${option.cost.food} W${option.cost.wood} S${option.cost.stone} M${option.cost.metal} • ${option.turnCost}t`,
        disabled: Boolean(city.production)
      }));
    }

    return [];
  }

  performAction(actionId) {
    if (actionId === 'found-city' && GameState.selectionType === 'unit') {
      const result = GameplayCore.foundCity(GameState.selectionData);
      if (result.ok) {
        this._selectCity(result.city, GameState.hexMap.getHex(result.city.q, result.city.r));
      } else {
        GameplayCore.pushMessage(result.reason);
      }
      this._syncSelectionState();
      return result;
    }

    if (actionId.startsWith('produce:') && GameState.selectionType === 'city') {
      const city = GameState.selectionData;
      const type = actionId.split(':')[1];
      const result = GameplayCore.queueProduction(city, type);
      if (!result.ok) {
        GameplayCore.pushMessage(result.reason);
      }
      this._syncSelectionState();
      return result;
    }

    return { ok: false, reason: 'Unknown action.' };
  }

  renderGameToText() {
    return GameplayCore.renderGameToText();
  }

  advanceDebugTime(ms) {
    const step = 1000 / 60;
    const count = Math.max(1, Math.round(ms / step));
    for (let index = 0; index < count; index += 1) {
      this.time.update(0, step);
    }
    this._needsRedraw = true;
  }

  _queueAITurn(playerName) {
    if (this._aiTurnPending) {
      return;
    }

    this._aiTurnPending = true;
    GameplayCore.pushMessage(`${playerName} weighs its options...`);
    this.time.delayedCall(550, () => {
      GameplayCore.runAITurn();
      this._aiTurnPending = false;
      if (GameState.winnerIndex === null && this.turnManager) {
        this.turnManager.endTurn();
      }
    });
  }

  _showVictoryOverlay(playerName) {
    if (this._victoryOverlay) {
      return;
    }

    const { width, height } = this.cameras.main;
    this._victoryOverlay = this.add.container(0, 0);
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x05070d, 0.72).setScrollFactor(0);
    const panel = this.add.rectangle(width / 2, height / 2, 480, 220, 0x111827, 0.95).setStrokeStyle(2, 0xc4a44a).setScrollFactor(0);
    const title = this.add.text(width / 2, height / 2 - 42, `${playerName} Prevails`, {
      fontSize: '40px',
      fontFamily: 'Georgia, serif',
      color: '#f6d77a',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    const body = this.add.text(width / 2, height / 2 + 10, 'The last rival city has fallen.\nStart a new skirmish to fight again.', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#d6dee9',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    this._victoryOverlay.add([backdrop, panel, title, body]);
  }

  _selectUnit(unit, hex) {
    GameState.selectionType = 'unit';
    GameState.selectionData = unit;
    this.hexRenderer.setSelection(unit.q, unit.r);
    EventBus.emit(EVENTS.UNIT_SELECTED, { unit, hex });
    this._syncSelectionState();
  }

  _selectCity(city, hex) {
    GameState.selectionType = 'city';
    GameState.selectionData = city;
    this.hexRenderer.setSelection(city.q, city.r);
    EventBus.emit(EVENTS.CITY_SELECTED, { city, hex });
    this._syncSelectionState();
  }

  _selectHex(hex) {
    GameState.selectionType = 'hex';
    GameState.selectionData = hex;
    this.hexRenderer.setSelection(hex.q, hex.r);
    EventBus.emit(EVENTS.HEX_SELECTED, { hex });
    this._syncSelectionState();
  }

  _syncSelectionState() {
    const selectedUnit = GameState.selectionType === 'unit' ? GameState.selectionData : null;
    const showReach = selectedUnit && selectedUnit.playerIndex === GameState.currentPlayerIndex;
    this.hexRenderer.setReachableHexes(showReach ? GameplayCore.getReachableHexes(selectedUnit) : []);
    this._needsRedraw = true;
  }

  _focusOnCurrentPlayer(centerCamera = true) {
    const playerUnits = GameState.getPlayerUnits(GameState.currentPlayerIndex);
    const scouts = playerUnits.filter((unit) => unit.type === 'scout');
    const focusUnit = scouts[0] || playerUnits[0] || null;
    if (focusUnit) {
      if (centerCamera) {
        this.centerOnHex(focusUnit.q, focusUnit.r);
      }
      this._selectUnit(focusUnit, GameState.hexMap.getHex(focusUnit.q, focusUnit.r));
      return;
    }

    const cities = GameState.getPlayerCities(GameState.currentPlayerIndex);
    if (cities[0]) {
      if (centerCamera) {
        this.centerOnHex(cities[0].q, cities[0].r);
      }
      this._selectCity(cities[0], GameState.hexMap.getHex(cities[0].q, cities[0].r));
    }
  }

  _frameMap() {
    const bounds = GameState.hexMap.getWorldBounds();
    const cam = this.cameras.main;
    const fitPadding = HEX_SIZE * 4;
    const zoomX = cam.width / (bounds.width + fitPadding * 2);
    const zoomY = cam.height / (bounds.height + fitPadding * 2);
    const zoom = Phaser.Math.Clamp(Math.min(zoomX, zoomY), ZOOM_MIN, ZOOM_MAX);
    cam.setZoom(zoom);
    this.centerOnWorld(bounds.centerX, bounds.centerY);
    this._needsRedraw = true;
  }
}
