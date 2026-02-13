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
