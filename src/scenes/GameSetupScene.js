/**
 * @file GameSetupScene.js
 * @description Game setup screen for configuring map size, fog of war,
 * AI difficulty, player names, and human/AI toggle.
 * @version 0.3.0
 */

import Phaser from 'phaser';
import { MAP_SIZES, FOG_MODE } from '../config/constants.js';
import { GameState } from '../core/GameState.js';

/** Setup option definitions */
const MAP_SIZE_OPTIONS = Object.keys(MAP_SIZES);
const FOG_OPTIONS = [
  { value: FOG_MODE.NONE, label: 'None' },
  { value: FOG_MODE.EXPLORED_ONLY, label: 'Explored Only' },
  { value: FOG_MODE.FULL, label: 'Full Fog' }
];
const AI_DIFFICULTY_OPTIONS = ['EASY', 'MEDIUM', 'HARD'];

export class GameSetupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameSetupScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // State for selections
    this._settings = {
      mapSize: 'MEDIUM',
      fogMode: FOG_MODE.NONE,
      aiDifficulty: 'MEDIUM',
      player1Name: 'Player 1',
      player2Name: 'Player 2',
      player2IsAI: true
    };

    // Title
    this.add.text(width / 2, 40, 'Game Setup', {
      fontSize: '42px',
      fontFamily: 'Georgia, serif',
      color: '#c4a44a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    let yPos = 110;
    const leftCol = width * 0.3;
    const rightCol = width * 0.65;
    const rowGap = 65;

    // --- Map Size ---
    this.add.text(leftCol, yPos, 'Map Size:', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#cccccc'
    }).setOrigin(0.5);

    this._mapSizeText = this._createCycleButton(rightCol, yPos, MAP_SIZE_OPTIONS, 1, (val) => {
      this._settings.mapSize = val;
    }, (val) => MAP_SIZES[val].label);

    yPos += rowGap;

    // --- Fog of War ---
    this.add.text(leftCol, yPos, 'Fog of War:', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#cccccc'
    }).setOrigin(0.5);

    this._createCycleButton(rightCol, yPos, FOG_OPTIONS.map(o => o.value), 0, (val) => {
      this._settings.fogMode = val;
    }, (val) => FOG_OPTIONS.find(o => o.value === val).label);

    yPos += rowGap;

    // --- AI Difficulty ---
    this.add.text(leftCol, yPos, 'AI Difficulty:', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#cccccc'
    }).setOrigin(0.5);

    this._createCycleButton(rightCol, yPos, AI_DIFFICULTY_OPTIONS, 1, (val) => {
      this._settings.aiDifficulty = val;
    }, (val) => val.charAt(0) + val.slice(1).toLowerCase());

    yPos += rowGap;

    // --- Player 1 Name ---
    this.add.text(leftCol, yPos, 'Player 1:', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#4488ff'
    }).setOrigin(0.5);

    this._p1NameText = this._createEditableText(rightCol, yPos, 'Player 1', (val) => {
      this._settings.player1Name = val;
    });

    yPos += rowGap;

    // --- Player 2 Name ---
    this.add.text(leftCol, yPos, 'Player 2:', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#ff4444'
    }).setOrigin(0.5);

    this._p2NameText = this._createEditableText(rightCol, yPos, 'Player 2', (val) => {
      this._settings.player2Name = val;
    });

    yPos += rowGap;

    // --- Player 2 AI toggle ---
    this.add.text(leftCol, yPos, 'Player 2 Type:', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#cccccc'
    }).setOrigin(0.5);

    this._createCycleButton(rightCol, yPos, [true, false], 0, (val) => {
      this._settings.player2IsAI = val;
    }, (val) => val ? 'AI' : 'Human');

    yPos += rowGap + 20;

    // --- Start Button ---
    this._createStartButton(width / 2, yPos);

    // --- Back Button ---
    this._createBackButton(80, height - 40);
  }

  /**
   * Create a cycle button (click to cycle through options).
   * @private
   */
  _createCycleButton(x, y, options, defaultIndex, onChange, formatLabel) {
    let currentIndex = defaultIndex;
    const btnWidth = 220;
    const btnHeight = 36;

    const bg = this.add.graphics();
    const text = this.add.text(x, y, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    const updateDisplay = () => {
      const val = options[currentIndex];
      text.setText(formatLabel(val));
      bg.clear();
      bg.fillStyle(0x2a2a4a, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
      bg.lineStyle(1, 0x666688, 1);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
    };

    updateDisplay();

    const zone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      currentIndex = (currentIndex + 1) % options.length;
      updateDisplay();
      onChange(options[currentIndex]);
    });
    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x3a3a5a, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
      bg.lineStyle(1, 0x8888aa, 1);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
    });
    zone.on('pointerout', updateDisplay);

    return text;
  }

  /**
   * Create an editable text field (click to edit via prompt).
   * @private
   */
  _createEditableText(x, y, defaultValue, onChange) {
    const btnWidth = 220;
    const btnHeight = 36;

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a4a, 1);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
    bg.lineStyle(1, 0x666688, 1);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);

    const text = this.add.text(x, y, defaultValue, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      const input = prompt('Enter name:', text.text);
      if (input && input.trim()) {
        const name = input.trim().substring(0, 16);
        text.setText(name);
        onChange(name);
      }
    });

    return text;
  }

  /**
   * Create the Start Game button.
   * @private
   */
  _createStartButton(x, y) {
    const btnWidth = 280;
    const btnHeight = 55;

    const bg = this.add.graphics();
    bg.fillStyle(0x336633, 1);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
    bg.lineStyle(2, 0x66cc66, 1);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);

    const text = this.add.text(x, y, 'Start Game', {
      fontSize: '26px',
      fontFamily: 'Georgia, serif',
      color: '#66cc66',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, btnWidth, btnHeight).setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x448844, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
      bg.lineStyle(2, 0x88ee88, 1);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
      text.setColor('#88ee88');
    });

    zone.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x336633, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
      bg.lineStyle(2, 0x66cc66, 1);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
      text.setColor('#66cc66');
    });

    zone.on('pointerdown', () => {
      this._startGame();
    });
  }

  /**
   * Create the Back button.
   * @private
   */
  _createBackButton(x, y) {
    const text = this.add.text(x, y, '< Back', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#888888'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    text.on('pointerover', () => text.setColor('#cccccc'));
    text.on('pointerout', () => text.setColor('#888888'));
    text.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }

  /**
   * Initialize GameState with selected settings and start the game.
   * @private
   */
  _startGame() {
    GameState.reset();
    GameState.settings = { ...this._settings };

    // Set up players
    GameState.players = [
      {
        name: this._settings.player1Name,
        isAI: false,
        color: 0x4488ff,
        resources: { wood: 0, stone: 0, food: 50, metal: 0 },
        researchedTechs: new Set(),
        currentResearch: null,
        researchProgress: 0
      },
      {
        name: this._settings.player2Name,
        isAI: this._settings.player2IsAI,
        color: 0xff4444,
        resources: { wood: 0, stone: 0, food: 50, metal: 0 },
        researchedTechs: new Set(),
        currentResearch: null,
        researchProgress: 0
      }
    ];

    this.scene.start('GameScene');
  }
}
