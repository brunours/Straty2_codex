/**
 * @file MainMenuScene.js
 * @description Main menu with New Game and Load Game options.
 * @version 0.3.0
 */

import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Title
    this.add.text(width / 2, height * 0.25, 'STRATY2', {
      fontSize: '72px',
      fontFamily: 'Georgia, serif',
      color: '#c4a44a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.35, 'Bronze Age Strategy', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#8a8a6a'
    }).setOrigin(0.5);

    // Menu buttons
    this._createButton(width / 2, height * 0.55, 'New Game', () => {
      this.scene.start('GameSetupScene');
    });

    this._createButton(width / 2, height * 0.65, 'Load Game', () => {
      // SaveLoadScene will be implemented in Phase 8
      console.log('Load Game - not yet implemented');
    });

    // Version
    this.add.text(width / 2, height * 0.9, 'v0.3.0', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#555555'
    }).setOrigin(0.5);
  }

  /**
   * Create a clickable menu button.
   * @private
   * @param {number} x
   * @param {number} y
   * @param {string} label
   * @param {Function} onClick
   */
  _createButton(x, y, label, onClick) {
    const btnWidth = 240;
    const btnHeight = 50;

    const bg = this.add.graphics();
    bg.fillStyle(0x333355, 1);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
    bg.lineStyle(2, 0xc4a44a, 1);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);

    const text = this.add.text(x, y, label, {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#c4a44a'
    }).setOrigin(0.5);

    // Interactive zone
    const hitArea = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x444477, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      bg.lineStyle(2, 0xddc466, 1);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      text.setColor('#ddc466');
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x333355, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      bg.lineStyle(2, 0xc4a44a, 1);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      text.setColor('#c4a44a');
    });

    hitArea.on('pointerdown', onClick);
  }
}
