/**
 * @file gameConfig.js
 * @description Phaser 3 game configuration object.
 * @version 0.1.0
 */

import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';

/**
 * Main Phaser game configuration.
 * Scenes will be added here as they are implemented.
 */
export const GAME_CONFIG = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene
  ]
};
