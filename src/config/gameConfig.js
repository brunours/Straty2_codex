/**
 * @file gameConfig.js
 * @description Phaser 3 game configuration object.
 * @version 0.3.0
 */

import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { GameSetupScene } from '../scenes/GameSetupScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { UIScene } from '../scenes/UIScene.js';
import { MapTestScene } from '../scenes/MapTestScene.js';

/**
 * Main Phaser game configuration.
 */
export const GAME_CONFIG = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    MainMenuScene,
    GameSetupScene,
    GameScene,
    UIScene,
    MapTestScene
  ]
};
