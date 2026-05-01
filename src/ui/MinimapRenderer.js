/**
 * @file MinimapRenderer.js
 * @description Bottom-right minimap showing the full map overview with
 * a camera viewport rectangle. Click-to-jump navigation.
 * @version 0.3.0
 */

import { HexGrid } from '../core/HexGrid.js';
import { GameState } from '../core/GameState.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 140;
const MINIMAP_MARGIN = 10;
const MINIMAP_BG = 0x111122;
const MINIMAP_BORDER = 0x444466;
const VIEWPORT_COLOR = 0xffff00;
const VIEWPORT_ALPHA = 0.6;

export class MinimapRenderer {
  /**
   * @param {Phaser.Scene} scene - The UIScene
   */
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.cameras.main;

    this._x = width - MINIMAP_WIDTH - MINIMAP_MARGIN;
    this._y = height - MINIMAP_HEIGHT - MINIMAP_MARGIN;

    // Background
    this._bgGraphics = scene.add.graphics();
    this._bgGraphics.fillStyle(MINIMAP_BG, 0.9);
    this._bgGraphics.fillRoundedRect(this._x, this._y, MINIMAP_WIDTH, MINIMAP_HEIGHT, 4);
    this._bgGraphics.lineStyle(1, MINIMAP_BORDER, 1);
    this._bgGraphics.strokeRoundedRect(this._x, this._y, MINIMAP_WIDTH, MINIMAP_HEIGHT, 4);

    // Map dots layer
    this._mapGraphics = scene.add.graphics();

    // Viewport rect layer
    this._viewportGraphics = scene.add.graphics();

    // Scale factors (calculated on first render)
    this._scaleX = 1;
    this._scaleY = 1;
    this._scale = 1;
    this._mapPixelWidth = 0;
    this._mapPixelHeight = 0;
    this._worldBounds = null;

    // Click-to-jump interaction
    const zone = scene.add.zone(
      this._x + MINIMAP_WIDTH / 2,
      this._y + MINIMAP_HEIGHT / 2,
      MINIMAP_WIDTH,
      MINIMAP_HEIGHT
    ).setInteractive({ useHandCursor: true });

    zone.on('pointerdown', (pointer) => {
      this._handleClick(pointer);
    });

    this._rendered = false;
  }

  /**
   * Render the minimap. Call once after map generation, then update viewport each frame.
   */
  renderMap() {
    if (!GameState.hexMap) return;

    const hexMap = GameState.hexMap;
    this._worldBounds = hexMap.getWorldBounds();
    this._mapPixelWidth = this._worldBounds.width;
    this._mapPixelHeight = this._worldBounds.height;
    this._mapOriginX = this._worldBounds.left;
    this._mapOriginY = this._worldBounds.top;

    // Scale to fit minimap
    const pad = 8;
    const availableWidth = MINIMAP_WIDTH - pad * 2;
    const availableHeight = MINIMAP_HEIGHT - pad * 2;
    this._scale = Math.min(
      availableWidth / Math.max(this._mapPixelWidth, 1),
      availableHeight / Math.max(this._mapPixelHeight, 1)
    );
    this._scaleX = this._scale;
    this._scaleY = this._scale;
    this._padX = pad + (availableWidth - this._mapPixelWidth * this._scale) / 2;
    this._padY = pad + (availableHeight - this._mapPixelHeight * this._scale) / 2;

    // Draw hex dots
    this._mapGraphics.clear();
    hexMap.forEachHex((hex) => {
      const { x, y } = HexGrid.axialToPixel(hex.q, hex.r);
      const mx = this._x + this._padX + (x - this._mapOriginX) * this._scaleX;
      const my = this._y + this._padY + (y - this._mapOriginY) * this._scaleY;

      const terrain = TERRAIN_CONFIG[hex.terrain];
      const color = terrain ? terrain.color : 0x000000;

      this._mapGraphics.fillStyle(color, 1);
      this._mapGraphics.fillRect(mx - 1, my - 1, 2, 2);
    });

    this._rendered = true;
  }

  /**
   * Update the viewport rectangle on the minimap.
   * @param {Phaser.Cameras.Scene2D.Camera} gameCamera - The GameScene's main camera
   */
  updateViewport(gameCamera) {
    if (!this._rendered || !this._worldBounds) return;

    this._viewportGraphics.clear();

    const view = gameCamera.worldView;
    const clippedLeft = Math.max(view.x, this._worldBounds.left);
    const clippedTop = Math.max(view.y, this._worldBounds.top);
    const clippedRight = Math.min(view.x + view.width, this._worldBounds.right);
    const clippedBottom = Math.min(view.y + view.height, this._worldBounds.bottom);

    if (clippedRight <= clippedLeft || clippedBottom <= clippedTop) {
      return;
    }

    const vx = this._x + this._padX + (clippedLeft - this._mapOriginX) * this._scaleX;
    const vy = this._y + this._padY + (clippedTop - this._mapOriginY) * this._scaleY;
    const vw = (clippedRight - clippedLeft) * this._scaleX;
    const vh = (clippedBottom - clippedTop) * this._scaleY;

    this._viewportGraphics.lineStyle(1, VIEWPORT_COLOR, VIEWPORT_ALPHA);
    this._viewportGraphics.strokeRect(vx, vy, vw, vh);
  }

  /**
   * Handle click on the minimap to jump camera.
   * @private
   */
  _handleClick(pointer) {
    if (!this._rendered || !this._worldBounds) return;

    // Convert click position to map world coordinates
    const localX = Math.max(0, Math.min(pointer.x - this._x - this._padX, this._mapPixelWidth * this._scaleX));
    const localY = Math.max(0, Math.min(pointer.y - this._y - this._padY, this._mapPixelHeight * this._scaleY));

    const worldX = this._mapOriginX + localX / this._scaleX;
    const worldY = this._mapOriginY + localY / this._scaleY;

    // Move the GameScene camera
    const gameScene = this.scene.scene.get('GameScene');
    if (gameScene) {
      gameScene.centerOnWorld(worldX, worldY);
    }
  }

  /**
   * Clean up graphics.
   */
  destroy() {
    this._bgGraphics.destroy();
    this._mapGraphics.destroy();
    this._viewportGraphics.destroy();
  }
}
