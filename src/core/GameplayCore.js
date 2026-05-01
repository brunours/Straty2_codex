/**
 * @file GameplayCore.js
 * @description Core rules for the playable loop: setup, movement, combat, city production, income, AI, and victory.
 */

import { GameState } from './GameState.js';
import { EventBus, EVENTS } from './EventBus.js';
import { HexGrid } from './HexGrid.js';
import { TERRAIN } from '../config/constants.js';
import { TERRAIN_CONFIG } from '../config/terrainConfig.js';
import { CITY_LEVELS, PRODUCTION_ORDER, UNIT_CONFIG, UNIT_TYPES, getCityLevel, getUnitConfig } from '../config/unitConfig.js';
import { PriorityQueue } from '../utils/PriorityQueue.js';

const STARTING_RESOURCES = {
  food: 52,
  wood: 26,
  stone: 16,
  metal: 10
};

const CITY_NAMES = [
  'Akkad',
  'Byblos',
  'Tyre',
  'Mari',
  'Susa',
  'Uruk',
  'Ebla',
  'Sidon',
  'Hattu',
  'Dilmun'
];

const AI_EXPANSION_CITY_TARGET = 3;

export class GameplayCore {
  static initializeMatch() {
    GameState.units.clear();
    GameState.cities.clear();
    GameState.winnerIndex = null;
    GameState.messageLog = [];

    GameState.players.forEach((player, index) => {
      player.resources = { ...STARTING_RESOURCES };
      player.researchedTechs = player.researchedTechs instanceof Set ? player.researchedTechs : new Set();
      player.currentResearch = null;
      player.researchProgress = 0;
      player.cityNameIndex = index * 4;
      player.income = { food: 0, wood: 0, stone: 0, metal: 0 };
      player.aiDifficulty = GameState.settings.aiDifficulty || 'MEDIUM';
      player.color = player.color ?? (index === 0 ? 0x4488ff : 0xff4444);
    });

    const starts = this._findStartingPositions();
    starts.forEach((start, playerIndex) => {
      const capital = this.createCity(playerIndex, start.q, start.r, {
        name: this._nextCityName(playerIndex),
        level: 1,
        population: 2,
        foodStockpile: 6
      });
      this._spawnStarterUnits(playerIndex, capital);
    });

    this.pushMessage('A new Bronze Age struggle begins.');
  }

  static createCity(playerIndex, q, r, overrides = {}) {
    const city = {
      id: GameState.generateCityId(),
      name: overrides.name || this._nextCityName(playerIndex),
      playerIndex,
      q,
      r,
      level: overrides.level ?? 0,
      population: overrides.population ?? 1,
      foodStockpile: overrides.foodStockpile ?? 0,
      production: overrides.production ?? null
    };

    GameState.addCity(city);
    return city;
  }

  static createUnit(type, playerIndex, q, r, overrides = {}) {
    const config = getUnitConfig(type);
    const unit = {
      id: GameState.generateUnitId(),
      type,
      label: config.label,
      symbol: config.symbol,
      playerIndex,
      q,
      r,
      hp: overrides.hp ?? config.maxHp,
      maxHp: config.maxHp,
      attack: config.attack,
      defense: config.defense,
      range: config.range,
      movement: config.movement,
      movementRemaining: overrides.movementRemaining ?? config.movement,
      visionRange: config.visionRange,
      canFoundCity: config.canFoundCity,
      canCapture: config.canCapture,
      naval: config.naval,
      aiRole: config.aiRole,
      hasActed: false,
      hasMoved: false
    };

    GameState.addUnit(unit);
    EventBus.emit(EVENTS.UNIT_CREATED, { unit });
    return unit;
  }

  static getReachableHexes(unit) {
    const visited = new Map();
    const frontier = [{ q: unit.q, r: unit.r, cost: 0 }];
    visited.set(HexGrid.key(unit.q, unit.r), 0);

    while (frontier.length > 0) {
      const current = frontier.shift();
      HexGrid.getNeighbors(current.q, current.r).forEach((neighbor) => {
        if (!this._canUnitEnter(unit, neighbor.q, neighbor.r, false)) {
          return;
        }

        const stepCost = this._getMoveCost(unit, neighbor.q, neighbor.r);
        const totalCost = current.cost + stepCost;
        const key = HexGrid.key(neighbor.q, neighbor.r);
        const occupant = GameState.getUnitAt(neighbor.q, neighbor.r);

        if (
          totalCost <= unit.movementRemaining &&
          (!visited.has(key) || totalCost < visited.get(key)) &&
          !occupant
        ) {
          visited.set(key, totalCost);
          frontier.push({ q: neighbor.q, r: neighbor.r, cost: totalCost });
        }
      });
    }

    return Array.from(visited.keys())
      .map(HexGrid.parseKey)
      .filter((hex) => !(hex.q === unit.q && hex.r === unit.r));
  }

  static moveUnit(unit, targetQ, targetR) {
    if (!unit || unit.movementRemaining <= 0) {
      return { ok: false, reason: 'This unit cannot move any further this turn.' };
    }

    const path = this.findPath(unit, targetQ, targetR);
    if (!path || path.length < 2) {
      return { ok: false, reason: 'No land route to that hex.' };
    }

    let spent = 0;
    let destination = { q: unit.q, r: unit.r };

    for (const step of path.slice(1)) {
      const stepCost = this._getMoveCost(unit, step.q, step.r);
      if (spent + stepCost > unit.movementRemaining) {
        break;
      }

      const occupant = GameState.getUnitAt(step.q, step.r);
      if (occupant) {
        break;
      }

      destination = { q: step.q, r: step.r };
      spent += stepCost;
    }

    if (destination.q === unit.q && destination.r === unit.r) {
      return { ok: false, reason: 'That hex is out of reach this turn.' };
    }

    const from = { q: unit.q, r: unit.r };
    GameState.hexMap.getHex(unit.q, unit.r).unitId = null;
    unit.q = destination.q;
    unit.r = destination.r;
    unit.movementRemaining -= spent;
    unit.hasMoved = true;
    GameState.hexMap.getHex(unit.q, unit.r).unitId = unit.id;

    const city = GameState.getCityAt(unit.q, unit.r);
    if (city && city.playerIndex !== unit.playerIndex && unit.canCapture) {
      this.captureCity(city, unit.playerIndex);
    }

    EventBus.emit(EVENTS.UNIT_MOVED, { unit, from, to: destination });
    return { ok: true, unit, from, to: destination };
  }

  static canFoundCity(unit) {
    if (!unit?.canFoundCity) {
      return false;
    }

    const hex = GameState.hexMap.getHex(unit.q, unit.r);
    if (!hex || hex.terrain === TERRAIN.OCEAN || hex.cityId) {
      return false;
    }

    return !GameState.getPlayerCities(unit.playerIndex).some((city) =>
      HexGrid.hexDistance(city.q, city.r, unit.q, unit.r) <= 1
    );
  }

  static foundCity(unit) {
    if (!this.canFoundCity(unit)) {
      return { ok: false, reason: 'Cities must be founded on open land and spaced apart.' };
    }

    const city = this.createCity(unit.playerIndex, unit.q, unit.r, {
      name: this._nextCityName(unit.playerIndex)
    });

    GameState.removeUnit(unit.id);
    EventBus.emit(EVENTS.CITY_FOUNDED, { city, playerIndex: unit.playerIndex });
    this.pushMessage(`${GameState.getPlayer(unit.playerIndex).name} founded ${city.name}.`);
    this._checkVictory();
    return { ok: true, city };
  }

  static queueProduction(city, unitType) {
    if (!city || city.playerIndex !== GameState.currentPlayerIndex) {
      return { ok: false, reason: 'Only the active player can give city orders.' };
    }

    if (city.production) {
      return { ok: false, reason: 'That city is already producing a unit.' };
    }

    const config = getUnitConfig(unitType);
    const player = GameState.getPlayer(city.playerIndex);
    if (!config || !this._canAfford(player.resources, config.cost)) {
      return { ok: false, reason: 'Not enough resources for that unit.' };
    }

    this._spendResources(player.resources, config.cost);
    city.production = {
      unitType,
      turnsRemaining: config.turnCost
    };

    EventBus.emit(EVENTS.RESOURCE_CHANGED, { playerIndex: city.playerIndex, resources: player.resources });
    EventBus.emit(EVENTS.CITY_PRODUCTION_STARTED, { city, unitType });
    this.pushMessage(`${city.name} begins training a ${config.label}.`);
    return { ok: true };
  }

  static getProductionOptions(city) {
    if (!city) {
      return [];
    }

    return PRODUCTION_ORDER.map((type) => ({
      type,
      ...getUnitConfig(type)
    }));
  }

  static canAttack(attacker, defender) {
    if (!attacker || !defender || attacker.playerIndex === defender.playerIndex || attacker.hp <= 0) {
      return false;
    }

    if (attacker.hasActed) {
      return false;
    }

    const distance = HexGrid.hexDistance(attacker.q, attacker.r, defender.q, defender.r);
    return distance > 0 && distance <= attacker.range;
  }

  static attackUnit(attacker, defender) {
    if (!this.canAttack(attacker, defender)) {
      return { ok: false, reason: 'Target is out of range.' };
    }

    const defenderHex = GameState.hexMap.getHex(defender.q, defender.r);
    const terrainBonus = TERRAIN_CONFIG[defenderHex.terrain]?.defenseBonus ?? 0;
    const flankBonus = HexGrid.getNeighbors(defender.q, defender.r)
      .map((hex) => GameState.getUnitAt(hex.q, hex.r))
      .filter((unit) => unit && unit.playerIndex === attacker.playerIndex && unit.id !== attacker.id)
      .length;

    const attackRoll = attacker.attack + Math.min(flankBonus, 3);
    const baseDamage = Math.max(
      1,
      Math.round((attackRoll - (defender.defense + terrainBonus) / 2) * this._combatVariance())
    );

    defender.hp -= baseDamage;

    let counterDamage = 0;
    const distance = HexGrid.hexDistance(attacker.q, attacker.r, defender.q, defender.r);
    if (defender.hp > 0 && !(attacker.range > 1 && distance > 1)) {
      counterDamage = Math.max(
        1,
        Math.round((defender.attack / 2) * this._combatVariance())
      );
      attacker.hp -= counterDamage;
    }

    attacker.hasActed = true;
    attacker.movementRemaining = 0;

    let attackerDied = false;
    let defenderDied = false;

    if (defender.hp <= 0) {
      defenderDied = true;
      GameState.removeUnit(defender.id);

      if (distance === 1 && attacker.hp > 0) {
        GameState.hexMap.getHex(attacker.q, attacker.r).unitId = null;
        attacker.q = defender.q;
        attacker.r = defender.r;
        GameState.hexMap.getHex(attacker.q, attacker.r).unitId = attacker.id;
      }

      const city = GameState.getCityAt(attacker.q, attacker.r);
      if (city && city.playerIndex !== attacker.playerIndex && attacker.canCapture) {
        this.captureCity(city, attacker.playerIndex);
      }
    }

    if (attacker.hp <= 0) {
      attackerDied = true;
      GameState.removeUnit(attacker.id);
    }

    const message = `${GameState.getPlayer(attacker.playerIndex).name}'s ${attacker.label} hit ${GameState.getPlayer(defender.playerIndex).name}'s ${defender.label} for ${baseDamage}.`;
    this.pushMessage(message);

    EventBus.emit(EVENTS.COMBAT_RESOLVED, {
      attacker,
      defender,
      baseDamage,
      counterDamage,
      attackerDied,
      defenderDied
    });

    if (defenderDied) {
      EventBus.emit(EVENTS.UNIT_DESTROYED, { unit: defender });
    }
    if (attackerDied) {
      EventBus.emit(EVENTS.UNIT_DESTROYED, { unit: attacker });
    }

    this._checkVictory();
    return { ok: true, baseDamage, counterDamage, attackerDied, defenderDied };
  }

  static processStartOfTurn(playerIndex) {
    if (GameState.winnerIndex !== null) {
      return;
    }

    const player = GameState.getPlayer(playerIndex);
    const cities = GameState.getPlayerCities(playerIndex);
    const totalIncome = { food: 0, wood: 0, stone: 0, metal: 0 };

    cities.forEach((city) => {
      const income = this._computeCityIncome(city);
      player.resources.food += income.food;
      player.resources.wood += income.wood;
      player.resources.stone += income.stone;
      player.resources.metal += income.metal;
      city.foodStockpile += income.food;

      totalIncome.food += income.food;
      totalIncome.wood += income.wood;
      totalIncome.stone += income.stone;
      totalIncome.metal += income.metal;

      this._handleCityGrowth(city);
      this._advanceProduction(city);
    });

    player.income = totalIncome;
    EventBus.emit(EVENTS.RESOURCE_CHANGED, { playerIndex, resources: player.resources, income: totalIncome });
    this._checkVictory();
  }

  static findPath(unit, targetQ, targetR) {
    const startKey = HexGrid.key(unit.q, unit.r);
    const goalKey = HexGrid.key(targetQ, targetR);
    const frontier = new PriorityQueue();
    frontier.enqueue({ q: unit.q, r: unit.r }, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();
    cameFrom.set(startKey, null);
    costSoFar.set(startKey, 0);

    while (!frontier.isEmpty) {
      const current = frontier.dequeue();
      const currentKey = HexGrid.key(current.q, current.r);

      if (currentKey === goalKey) {
        break;
      }

      HexGrid.getNeighbors(current.q, current.r).forEach((neighbor) => {
        const isGoal = neighbor.q === targetQ && neighbor.r === targetR;
        if (!this._canUnitEnter(unit, neighbor.q, neighbor.r, isGoal)) {
          return;
        }

        const moveCost = this._getMoveCost(unit, neighbor.q, neighbor.r);
        const newCost = costSoFar.get(currentKey) + moveCost;
        const neighborKey = HexGrid.key(neighbor.q, neighbor.r);

        if (!costSoFar.has(neighborKey) || newCost < costSoFar.get(neighborKey)) {
          costSoFar.set(neighborKey, newCost);
          const priority = newCost + HexGrid.hexDistance(neighbor.q, neighbor.r, targetQ, targetR);
          frontier.enqueue({ q: neighbor.q, r: neighbor.r }, priority);
          cameFrom.set(neighborKey, current);
        }
      });
    }

    if (!cameFrom.has(goalKey)) {
      return null;
    }

    const path = [];
    let currentKey = goalKey;
    while (currentKey) {
      const point = HexGrid.parseKey(currentKey);
      path.unshift(point);
      const previous = cameFrom.get(currentKey);
      currentKey = previous ? HexGrid.key(previous.q, previous.r) : null;
    }
    return path;
  }

  static runAITurn() {
    const playerIndex = GameState.currentPlayerIndex;
    const player = GameState.getPlayer(playerIndex);
    const logs = [];

    const cities = GameState.getPlayerCities(playerIndex);
    cities.forEach((city) => {
      if (!city.production) {
        const type = this._chooseAIProduction(playerIndex, city);
        if (type) {
          const result = this.queueProduction(city, type);
          if (result.ok) {
            logs.push(`${city.name} queues ${getUnitConfig(type).label}`);
          }
        }
      }
    });

    const units = GameState.getPlayerUnits(playerIndex)
      .slice()
      .sort((a, b) => {
        const priority = { settler: 0, spearman: 1, archer: 2, scout: 3 };
        return (priority[a.type] ?? 9) - (priority[b.type] ?? 9);
      });

    units.forEach((unit) => {
      if (!GameState.units.has(unit.id) || unit.hp <= 0) {
        return;
      }

      const action = unit.type === UNIT_TYPES.SETTLER
        ? this._runAISettler(unit)
        : this._runAICombatant(unit);

      if (action) {
        logs.push(action);
      }
    });

    if (logs.length === 0) {
      logs.push(`${player.name} regroups.`);
    }

    this.pushMessage(`${player.name} turn: ${logs[0]}`);
    return logs;
  }

  static renderGameToText() {
    const currentPlayer = GameState.getCurrentPlayer();
    const payload = {
      mode: GameState.winnerIndex !== null ? 'victory' : 'playing',
      turn: GameState.turnNumber,
      activePlayer: currentPlayer ? currentPlayer.name : null,
      winner: GameState.winnerIndex !== null ? GameState.getPlayer(GameState.winnerIndex)?.name : null,
      selection: GameState.selectionType
        ? {
            type: GameState.selectionType,
            id: GameState.selectionData?.id ?? null,
            q: GameState.selectionData?.q ?? null,
            r: GameState.selectionData?.r ?? null
          }
        : null,
      coordinateSystem: 'Flat-top axial hexes. q increases east, r increases south-east.',
      players: GameState.players.map((player, index) => ({
        name: player.name,
        isAI: player.isAI,
        resources: player.resources,
        income: player.income,
        cities: GameState.getPlayerCities(index).map((city) => ({
          name: city.name,
          q: city.q,
          r: city.r,
          population: city.population,
          level: getCityLevel(city.level).label,
          production: city.production
        })),
        units: GameState.getPlayerUnits(index).map((unit) => ({
          id: unit.id,
          type: unit.type,
          q: unit.q,
          r: unit.r,
          hp: unit.hp,
          movementRemaining: unit.movementRemaining,
          acted: unit.hasActed
        }))
      })),
      messages: [...GameState.messageLog]
    };

    return JSON.stringify(payload);
  }

  static pushMessage(message) {
    GameState.pushMessage(message);
    EventBus.emit(EVENTS.GAME_MESSAGE, { message, log: [...GameState.messageLog] });
  }

  static _advanceProduction(city) {
    if (!city.production) {
      return;
    }

    city.production.turnsRemaining -= 1;
    if (city.production.turnsRemaining > 0) {
      return;
    }

    const spawn = this._findSpawnHex(city.q, city.r, city.production.unitType);
    const unitLabel = getUnitConfig(city.production.unitType).label;

    if (!spawn) {
      city.production.turnsRemaining = 1;
      this.pushMessage(`${city.name} is blocked and delays its ${unitLabel}.`);
      return;
    }

    const unit = this.createUnit(city.production.unitType, city.playerIndex, spawn.q, spawn.r);
    city.production = null;
    EventBus.emit(EVENTS.CITY_PRODUCTION_COMPLETED, { city, unit });
    this.pushMessage(`${city.name} trained a ${unit.label}.`);
  }

  static _handleCityGrowth(city) {
    const level = getCityLevel(city.level);
    const threshold = 10 + city.population * 5;
    if (city.foodStockpile >= threshold && city.population < level.populationCap) {
      city.foodStockpile -= threshold;
      city.population += 1;
      this.pushMessage(`${city.name} grows to population ${city.population}.`);

      if (city.level < CITY_LEVELS.length - 1 && city.population >= CITY_LEVELS[city.level + 1].populationCap / 2) {
        city.level += 1;
        EventBus.emit(EVENTS.CITY_EVOLVED, { city });
        this.pushMessage(`${city.name} advances to a ${getCityLevel(city.level).label}.`);
      }
    }
  }

  static _computeCityIncome(city) {
    const income = {
      food: 2 + city.population,
      wood: 0,
      stone: 0,
      metal: 0
    };

    const radius = getCityLevel(city.level).radius;
    const tiles = HexGrid.hexSpiral(city.q, city.r, radius);
    tiles.forEach(({ q, r }) => {
      const hex = GameState.hexMap.getHex(q, r);
      if (!hex) {
        return;
      }

      if (hex.hasRiver) {
        income.food += 1;
      }

      if (hex.hasResource && hex.resourceType) {
        income[hex.resourceType] += hex.q === city.q && hex.r === city.r ? 2 : 1;
      }
    });

    return income;
  }

  static _checkVictory() {
    const alivePlayers = GameState.players
      .map((_, index) => index)
      .filter((index) => GameState.getPlayerCities(index).length > 0);

    if (alivePlayers.length === 1 && GameState.winnerIndex === null) {
      GameState.winnerIndex = alivePlayers[0];
      EventBus.emit(EVENTS.VICTORY, { winnerIndex: alivePlayers[0], player: GameState.getPlayer(alivePlayers[0]) });
      this.pushMessage(`${GameState.getPlayer(alivePlayers[0]).name} wins the war for the Bronze Age.`);
    }
  }

  static _spawnStarterUnits(playerIndex, city) {
    const unitTypes = [UNIT_TYPES.SCOUT, UNIT_TYPES.SPEARMAN, UNIT_TYPES.SETTLER];
    unitTypes.forEach((type, offset) => {
      const spawn = this._findSpawnHex(city.q, city.r, type, offset);
      if (spawn) {
        this.createUnit(type, playerIndex, spawn.q, spawn.r);
      }
    });
  }

  static _findSpawnHex(centerQ, centerR, unitType, rotationOffset = 0) {
    const unitConfig = getUnitConfig(unitType);
    for (let radius = 1; radius <= 3; radius++) {
      const ring = HexGrid.hexRing(centerQ, centerR, radius);
      for (let i = 0; i < ring.length; i++) {
        const step = ring[(i + rotationOffset) % ring.length];
        if (this._canUnitEnter({ naval: unitConfig.naval }, step.q, step.r, true) && !GameState.getUnitAt(step.q, step.r)) {
          return step;
        }
      }
    }
    return null;
  }

  static _findStartingPositions() {
    const candidates = [];
    GameState.hexMap.forEachHex((hex) => {
      if (hex.terrain === TERRAIN.OCEAN) {
        return;
      }

      const localTiles = HexGrid.hexSpiral(hex.q, hex.r, 2)
        .map(({ q, r }) => GameState.hexMap.getHex(q, r))
        .filter(Boolean);

      const localLand = localTiles.filter((tile) => tile.terrain !== TERRAIN.OCEAN).length;
      const resources = localTiles.filter((tile) => tile.hasResource).length;
      const rivers = localTiles.filter((tile) => tile.hasRiver).length;
      const score = localLand + resources * 2 + rivers;
      candidates.push({ q: hex.q, r: hex.r, score });
    });

    candidates.sort((a, b) => b.score - a.score);
    const first = candidates[0];
    const second = candidates.find((candidate) =>
      HexGrid.hexDistance(first.q, first.r, candidate.q, candidate.r) >= Math.floor(Math.min(GameState.hexMap.cols, GameState.hexMap.rows) / 2)
    ) || candidates[Math.max(1, Math.floor(candidates.length / 3))];

    return [first, second];
  }

  static _chooseAIProduction(playerIndex, city) {
    const player = GameState.getPlayer(playerIndex);
    const cities = GameState.getPlayerCities(playerIndex);
    const units = GameState.getPlayerUnits(playerIndex);
    const military = units.filter((unit) => unit.canCapture);
    const settlers = units.filter((unit) => unit.type === UNIT_TYPES.SETTLER);

    const preferred = [];
    if (cities.length < AI_EXPANSION_CITY_TARGET && settlers.length === 0) {
      preferred.push(UNIT_TYPES.SETTLER);
    }
    if (military.length < cities.length + 1) {
      preferred.push(UNIT_TYPES.SPEARMAN, UNIT_TYPES.ARCHER);
    }
    preferred.push(UNIT_TYPES.SCOUT);

    const options = [...new Set([...preferred, ...PRODUCTION_ORDER])];
    return options.find((type) => this._canAfford(player.resources, getUnitConfig(type).cost)) || null;
  }

  static _runAISettler(unit) {
    if (this.canFoundCity(unit)) {
      const result = this.foundCity(unit);
      if (result.ok) {
        return `Founded ${result.city.name}`;
      }
    }

    const target = this._findBestSettlementTarget(unit.playerIndex);
    if (!target) {
      return null;
    }

    const move = this.moveUnit(unit, target.q, target.r);
    return move.ok ? `Settler advances toward new land` : null;
  }

  static _runAICombatant(unit) {
    const enemyTargets = GameState.players
      .map((_, index) => index)
      .filter((index) => index !== unit.playerIndex)
      .flatMap((index) => GameState.getPlayerUnits(index));

    const inRange = enemyTargets.find((enemy) => this.canAttack(unit, enemy));
    if (inRange) {
      this.attackUnit(unit, inRange);
      return `${unit.label} attacks ${inRange.label}`;
    }

    const enemyCities = GameState.players
      .map((_, index) => index)
      .filter((index) => index !== unit.playerIndex)
      .flatMap((index) => GameState.getPlayerCities(index));

    const targetCity = this._nearestByDistance(unit, enemyCities);
    if (targetCity) {
      const move = this.moveUnit(unit, targetCity.q, targetCity.r);
      if (move.ok) {
        return `${unit.label} marches toward ${targetCity.name}`;
      }
    }

    const neutralTarget = this._nearestResourceHex(unit);
    if (neutralTarget) {
      const move = this.moveUnit(unit, neutralTarget.q, neutralTarget.r);
      if (move.ok) {
        return `${unit.label} scouts the frontier`;
      }
    }

    return null;
  }

  static _findBestSettlementTarget(playerIndex) {
    const friendlyCities = GameState.getPlayerCities(playerIndex);
    let best = null;

    GameState.hexMap.forEachHex((hex) => {
      if (hex.terrain === TERRAIN.OCEAN || hex.cityId) {
        return;
      }

      if (friendlyCities.some((city) => HexGrid.hexDistance(city.q, city.r, hex.q, hex.r) <= 1)) {
        return;
      }

      const tiles = HexGrid.hexSpiral(hex.q, hex.r, 2)
        .map(({ q, r }) => GameState.hexMap.getHex(q, r))
        .filter(Boolean);

      const score = tiles.filter((tile) => tile.hasResource).length * 3
        + tiles.filter((tile) => tile.hasRiver).length
        + tiles.filter((tile) => tile.terrain !== TERRAIN.OCEAN).length;

      if (!best || score > best.score) {
        best = { q: hex.q, r: hex.r, score };
      }
    });

    return best;
  }

  static _nearestResourceHex(unit) {
    let best = null;
    GameState.hexMap.forEachHex((hex) => {
      if (!hex.hasResource || GameState.getUnitAt(hex.q, hex.r)) {
        return;
      }

      const distance = HexGrid.hexDistance(unit.q, unit.r, hex.q, hex.r);
      if (!best || distance < best.distance) {
        best = { q: hex.q, r: hex.r, distance };
      }
    });

    return best;
  }

  static _nearestByDistance(source, items) {
    let best = null;
    items.forEach((item) => {
      const distance = HexGrid.hexDistance(source.q, source.r, item.q, item.r);
      if (!best || distance < best.distance) {
        best = { ...item, distance };
      }
    });
    return best;
  }

  static _combatVariance() {
    return 0.85 + Math.random() * 0.3;
  }

  static _canUnitEnter(unit, q, r, allowOccupiedGoal = false) {
    const hex = GameState.hexMap.getHex(q, r);
    if (!hex) {
      return false;
    }

    if (unit.naval) {
      if (hex.terrain !== TERRAIN.OCEAN) {
        return false;
      }
    } else if (!TERRAIN_CONFIG[hex.terrain]?.passable) {
      return false;
    }

    const occupant = GameState.getUnitAt(q, r);
    if (occupant && !(allowOccupiedGoal && occupant.playerIndex !== unit.playerIndex)) {
      return false;
    }

    return true;
  }

  static _getMoveCost(unit, q, r) {
    const hex = GameState.hexMap.getHex(q, r);
    if (!hex) {
      return Infinity;
    }

    if (unit.naval) {
      return hex.terrain === TERRAIN.OCEAN ? 1 : Infinity;
    }

    return TERRAIN_CONFIG[hex.terrain]?.moveCost ?? Infinity;
  }

  static _canAfford(resources, cost) {
    return Object.keys(cost).every((key) => (resources[key] ?? 0) >= cost[key]);
  }

  static _spendResources(resources, cost) {
    Object.keys(cost).forEach((key) => {
      resources[key] -= cost[key];
    });
  }

  static _nextCityName(playerIndex) {
    const player = GameState.getPlayer(playerIndex);
    const name = CITY_NAMES[player.cityNameIndex % CITY_NAMES.length];
    player.cityNameIndex += 1;
    return `${name}`;
  }

  static captureCity(city, newPlayerIndex) {
    city.playerIndex = newPlayerIndex;
    city.level = Math.max(0, city.level - 1);
    city.population = Math.max(1, Math.ceil(city.population / 2));
    city.foodStockpile = 0;
    city.production = null;
    EventBus.emit(EVENTS.CITY_CAPTURED, { city, playerIndex: newPlayerIndex });
    this.pushMessage(`${GameState.getPlayer(newPlayerIndex).name} captured ${city.name}.`);
    this._checkVictory();
  }
}
