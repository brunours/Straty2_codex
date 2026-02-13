/**
 * @file BootScene.js
 * @description Boot scene for asset preloading and initial setup.
 * This is the first scene loaded by Phaser.
 * @version 0.3.0
 */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  /**
   * Preload assets. Currently displays a loading placeholder.
   * Assets will be added as they are created in later phases.
   */
  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xc4a44a, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });
  }

  /**
   * Shows title briefly then transitions to MainMenuScene.
   */
  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.text(width / 2, height / 2 - 60, 'STRATY2', {
      fontSize: '64px',
      fontFamily: 'Georgia, serif',
      color: '#c4a44a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'Bronze Age Strategy', {
      fontSize: '24px',
      fontFamily: 'Georgia, serif',
      color: '#8a8a6a'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 60, 'v0.3.0', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666'
    }).setOrigin(0.5);

    // Transition to main menu after a brief delay
    this.time.delayedCall(1500, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
