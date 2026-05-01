/**
 * @file main.js
 * @description Entry point for Straty2 - Bronze Age 4X hex strategy game.
 * Bootstraps the Phaser 3 game instance.
 * @version 0.1.0
 */

import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig.js';

/** Create and start the Phaser game instance */
const game = new Phaser.Game(GAME_CONFIG);

window.__straty2Game = game;

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

window.render_game_to_text = () => {
  const scene = game.scene.getScene('GameScene');
  return scene?.renderGameToText?.() ?? JSON.stringify({ mode: 'loading' });
};

window.advanceTime = (ms = 16) => {
  const scene = game.scene.getScene('GameScene');
  scene?.advanceDebugTime?.(ms);
};
