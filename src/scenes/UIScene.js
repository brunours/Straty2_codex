/**
 * @file UIScene.js
 * @description Parallel overlay scene for HUD elements. Runs alongside
 * GameScene, rendering UI on top of the game world.
 * @version 0.3.0
 */

import Phaser from 'phaser';
import { HUDPanel } from '../ui/HUDPanel.js';
import { SelectionPanel } from '../ui/SelectionPanel.js';
import { MinimapRenderer } from '../ui/MinimapRenderer.js';
import { GameState } from '../core/GameState.js';
import { EventBus, EVENTS } from '../core/EventBus.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.hudPanel = null;
    this.selectionPanel = null;
    this.minimap = null;
  }

  create() {
    // HUD top bar
    this.hudPanel = new HUDPanel(this);

    // Selection info panel (bottom-left)
    this.selectionPanel = new SelectionPanel(this);

    // Minimap (bottom-right)
    this.minimap = new MinimapRenderer(this);

    // Render minimap once the map is ready
    this.time.delayedCall(100, () => {
      this.minimap.renderMap();
    });

    // Listen for turn changes to refresh HUD
    this._unsub = [];
    this._unsub.push(EventBus.on(EVENTS.TURN_STARTED, () => {
      this.hudPanel.update();
    }));

    this._unsub.push(EventBus.on(EVENTS.GAME_STARTED, () => {
      this.hudPanel.update();
      this.minimap.renderMap();
    }));
  }

  update() {
    // Update minimap viewport rectangle each frame
    const gameScene = this.scene.get('GameScene');
    if (gameScene && this.minimap) {
      this.minimap.updateViewport(gameScene.cameras.main);
    }
  }

  /**
   * Clean up when the scene shuts down.
   */
  shutdown() {
    if (this.hudPanel) this.hudPanel.destroy();
    if (this.selectionPanel) this.selectionPanel.destroy();
    if (this.minimap) this.minimap.destroy();
    this._unsub.forEach(fn => fn());
  }
}
