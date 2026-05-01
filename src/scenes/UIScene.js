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
import { ActionPanel } from '../ui/ActionPanel.js';
import { MessagePanel } from '../ui/MessagePanel.js';
import { EventBus, EVENTS } from '../core/EventBus.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.hudPanel = null;
    this.selectionPanel = null;
    this.minimap = null;
    this.actionPanel = null;
    this.messagePanel = null;
    this._sidebarExpanded = true;
    this._sidebarBg = null;
    this._sidebarToggleBg = null;
    this._sidebarToggleText = null;
    this._sidebarToggleZone = null;
  }

  create() {
    this.hudPanel = new HUDPanel(this);
    this._sidebarBg = this.add.graphics();
    this._sidebarToggleBg = this.add.graphics();
    this._sidebarToggleText = this.add.text(0, 0, '', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#f3d27a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this._sidebarToggleZone = this.add.zone(0, 0, 24, 52).setInteractive({ useHandCursor: true });
    this._sidebarToggleZone.on('pointerdown', () => {
      this._sidebarExpanded = !this._sidebarExpanded;
      this._layoutUi();
    });

    this.selectionPanel = new SelectionPanel(this);
    this.minimap = new MinimapRenderer(this);
    this.actionPanel = new ActionPanel(this);
    this.messagePanel = new MessagePanel(this);
    this._layoutUi();

    this.time.delayedCall(100, () => {
      this.minimap.renderMap();
    });

    this._unsub = [];
    this._unsub.push(EventBus.on(EVENTS.TURN_STARTED, () => {
      this.hudPanel.update();
    }));

    this._unsub.push(EventBus.on(EVENTS.GAME_STARTED, () => {
      this.hudPanel.update();
      this.minimap.renderMap();
    }));

    this.scale.on('resize', () => {
      this._layoutUi();
      this.minimap.renderMap();
    });
  }

  update() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene && this.minimap) {
      this.minimap.updateViewport(gameScene.cameras.main);
    }
  }

  shutdown() {
    if (this.hudPanel) this.hudPanel.destroy();
    if (this.selectionPanel) this.selectionPanel.destroy();
    if (this.minimap) this.minimap.destroy();
    if (this.actionPanel) this.actionPanel.destroy();
    if (this.messagePanel) this.messagePanel.destroy();
    this._sidebarBg?.destroy();
    this._sidebarToggleBg?.destroy();
    this._sidebarToggleText?.destroy();
    this._sidebarToggleZone?.destroy();
    this._unsub.forEach((fn) => fn());
  }

  _layoutUi() {
    const width = this.scale.width;
    const height = this.scale.height;
    const gameScene = this.scene.get('GameScene');

    this.hudPanel.layout(width);

    const selectionX = 14;
    const selectionY = height - this.selectionPanel.height - 14;
    this.selectionPanel.layout(selectionX, selectionY);

    const minimapWidth = Math.max(190, Math.min(250, Math.floor(width * 0.17)));
    const minimapHeight = Math.round(minimapWidth * 0.74);
    this.minimap.layout(width - minimapWidth - 16, height - minimapHeight - 16, minimapWidth, minimapHeight);

    const sidebarX = 14;
    const sidebarY = this.hudPanel.height + 12;
    const sidebarBottom = selectionY - 12;
    const expandedWidth = Math.max(300, Math.min(360, Math.floor(width * 0.24)));
    const sidebarWidth = this._sidebarExpanded ? expandedWidth : 0;
    const sidebarHeight = Math.max(240, sidebarBottom - sidebarY);
    const overlayOffset = this._sidebarExpanded ? Math.round(sidebarWidth * 0.5) : 0;

    gameScene?.setViewportOverlayOffset(overlayOffset);

    this._sidebarBg.clear();
    if (this._sidebarExpanded) {
      this._sidebarBg.fillStyle(0x0b1220, 0.74);
      this._sidebarBg.fillRoundedRect(sidebarX, sidebarY, sidebarWidth, sidebarHeight, 12);
      this._sidebarBg.lineStyle(1, 0x36465c, 1);
      this._sidebarBg.strokeRoundedRect(sidebarX, sidebarY, sidebarWidth, sidebarHeight, 12);
    }

    const toggleX = sidebarX + (this._sidebarExpanded ? sidebarWidth + 14 : 16);
    const toggleY = sidebarY + 28;
    this._sidebarToggleBg.clear();
    this._sidebarToggleBg.fillStyle(0x111827, 0.96);
    this._sidebarToggleBg.fillRoundedRect(toggleX - 12, toggleY - 26, 24, 52, 8);
    this._sidebarToggleBg.lineStyle(1, 0x53657b, 1);
    this._sidebarToggleBg.strokeRoundedRect(toggleX - 12, toggleY - 26, 24, 52, 8);
    this._sidebarToggleText.setText(this._sidebarExpanded ? '<' : '>');
    this._sidebarToggleText.setPosition(toggleX, toggleY);
    this._sidebarToggleZone.setPosition(toggleX, toggleY);
    this._sidebarToggleZone.setSize(24, 52);

    if (this._sidebarExpanded) {
      const innerX = sidebarX + 12;
      const innerY = sidebarY + 12;
      const innerWidth = sidebarWidth - 24;
      const actionHeight = Math.max(250, Math.min(320, Math.floor(sidebarHeight * 0.5)));
      const messageHeight = Math.max(150, sidebarHeight - actionHeight - 36);
      this.actionPanel.setVisible(true);
      this.messagePanel.setVisible(true);
      this.actionPanel.layout({ x: innerX, y: innerY, width: innerWidth, height: actionHeight });
      this.messagePanel.layout({
        x: innerX,
        y: innerY + actionHeight + 12,
        width: innerWidth,
        height: messageHeight
      });
      return;
    }

    this.actionPanel.setVisible(false);
    this.messagePanel.setVisible(false);
  }
}
