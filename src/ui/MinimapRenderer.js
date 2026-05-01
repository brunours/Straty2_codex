/**
 * @file MinimapRenderer.js
 * @description Bottom-right minimap showing the full map overview with
 * a camera viewport rectangle. Click-to-jump navigation.
 * @version 0.3.0
 */

import { HexGrid } from '../core/HexGrid.js';
import { GameState } from '../core/GameState.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';
import { HEX_SIZE } from '../config/constants.js';

const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 164;
const MINIMAP_MARGIN = 10;
const MINIMAP_BG = 0x111122;
const MINIMAP_BORDER = 0x444466;
const VIEWPORT_COLOR = 0xffff00;
const VIEWPORT_ALPHA = 0.6;

export class MinimapRenderer {
  constructor(scene) {
    this.scene = scene;
    this.width = MINIMAP_WIDTH;
    this.height = MINIMAP_HEIGHT;
    this._x = 0;
    this._y = 0;

    this._bgGraphics = scene.add.graphics();
    this._mapGraphics = scene.add.graphics();
    this._viewportGraphics = scene.add.graphics();

    this._scaleX = 1;
    this._scaleY = 1;
    this._scale = 1;
    this._mapPixelWidth = 0;
    this._mapPixelHeight = 0;
    this._worldBounds = null;

    this._zone = scene.add.zone(0, 0, this.width, this.height).setInteractive({ useHandCursor: true });
    this._zone.on('pointerdown', (pointer) => {
      this._handleClick(pointer);
    });

    this._rendered = false;
    this.layout(
      scene.cameras.main.width - this.width - MINIMAP_MARGIN,
      scene.cameras.main.height - this.height - MINIMAP_MARGIN
    );
  }

  layout(x, y, width = MINIMAP_WIDTH, height = MINIMAP_HEIGHT) {
    this._x = x;
    this._y = y;
    this.width = width;
    this.height = height;

    this._bgGraphics.clear();
    this._bgGraphics.fillStyle(MINIMAP_BG, 0.9);
    this._bgGraphics.fillRoundedRect(this._x, this._y, this.width, this.height, 4);
    this._bgGraphics.lineStyle(1, MINIMAP_BORDER, 1);
    this._bgGraphics.strokeRoundedRect(this._x, this._y, this.width, this.height, 4);

    this._zone.setPosition(this._x + this.width / 2, this._y + this.height / 2);
    this._zone.setSize(this.width, this.height);
  }

  renderMap() {
    if (!GameState.hexMap) return;

    const hexMap = GameState.hexMap;
    this._worldBounds = hexMap.getWorldBounds();
    this._mapPixelWidth = this._worldBounds.width;
    this._mapPixelHeight = this._worldBounds.height;
    this._mapOriginX = this._worldBounds.left;
    this._mapOriginY = this._worldBounds.top;

    const pad = 8;
    const availableWidth = this.width - pad * 2;
    const availableHeight = this.height - pad * 2;
    this._scale = Math.min(
      availableWidth / Math.max(this._mapPixelWidth, 1),
      availableHeight / Math.max(this._mapPixelHeight, 1)
    );
    this._scaleX = this._scale;
    this._scaleY = this._scale;
    this._padX = pad + (availableWidth - this._mapPixelWidth * this._scale) / 2;
    this._padY = pad + (availableHeight - this._mapPixelHeight * this._scale) / 2;

    this._mapGraphics.clear();
    hexMap.forEachHex((hex) => {
      const { x, y } = HexGrid.axialToPixel(hex.q, hex.r);
      const mx = this._x + this._padX + (x - this._mapOriginX) * this._scaleX;
      const my = this._y + this._padY + (y - this._mapOriginY) * this._scaleY;
      const terrain = TERRAIN_CONFIG[hex.terrain];
      const color = terrain ? terrain.color : 0x000000;
      this._drawMiniHex(mx, my, Math.max(HEX_SIZE * this._scale * 1.04, 1.5), color);
    });

    this._rendered = true;
  }

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

  destroy() {
    this._bgGraphics.destroy();
    this._mapGraphics.destroy();
    this._viewportGraphics.destroy();
    this._zone.destroy();
  }

  _handleClick(pointer) {
    if (!this._rendered || !this._worldBounds) return;

    const localX = Math.max(0, Math.min(pointer.x - this._x - this._padX, this._mapPixelWidth * this._scaleX));
    const localY = Math.max(0, Math.min(pointer.y - this._y - this._padY, this._mapPixelHeight * this._scaleY));
    const worldX = this._mapOriginX + localX / this._scaleX;
    const worldY = this._mapOriginY + localY / this._scaleY;

    const gameScene = this.scene.scene.get('GameScene');
    if (gameScene) {
      gameScene.centerOnWorld(worldX, worldY);
    }
  }

  _drawMiniHex(cx, cy, size, color) {
    const corners = HexGrid.getHexCorners(cx, cy, size);
    this._mapGraphics.fillStyle(color, 1);
    this._mapGraphics.beginPath();
    this._mapGraphics.moveTo(corners[0].x, corners[0].y);
    for (let index = 1; index < corners.length; index += 1) {
      this._mapGraphics.lineTo(corners[index].x, corners[index].y);
    }
    this._mapGraphics.closePath();
    this._mapGraphics.fillPath();
  }
}
