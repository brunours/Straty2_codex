# Straty2 - Game Design Document

**Version**: 0.1.0
**Genre**: 4X Turn-Based Strategy
**Setting**: Bronze Age
**Players**: 2 (Human vs AI, or Human vs Human hot-seat)
**Engine**: Phaser 3 (JavaScript)

---

## 1. Game Overview

Straty2 is a turn-based 4X strategy game set in the Bronze Age. Players explore procedurally generated hex-tile maps, expand their territory by founding cities, exploit resources (Wood, Stone, Food, Metal), and exterminate their opponent through military conquest. The game features a branching technology tree, city evolution, combined arms combat, and configurable fog of war.

---

## 2. Map

### 2.1 Hex Grid
- Flat-top hexagons using axial coordinates (q, r)
- Hex size: 32 pixels (outer radius)

### 2.2 Map Sizes
| Size | Width | Height | Total Hexes |
|------|-------|--------|-------------|
| Small | 20 | 15 | ~300 |
| Medium | 30 | 25 | ~750 |
| Large | 50 | 40 | ~2,000 |
| Huge | 100 | 80 | ~8,000 |

### 2.3 Terrain Types
| Terrain | Move Cost | Defense Bonus | Resource | Color |
|---------|-----------|---------------|----------|-------|
| Ocean | Impassable (boats only) | 0 | - | Blue |
| Grassland | 1 | 0 | Food | Green |
| Forest | 2 | +1 | Wood | Dark Green |
| Mountain | 3 | +2 | Stone | Gray |
| Desert | 2 | 0 | - | Sand |
| Hills | 2 | +1 | Metal | Yellow-Green |
| Swamp | 3 | -1 | - | Murky Green |

### 2.4 Rivers
- Generated from mountain sources flowing downhill to ocean
- Overlay on existing terrain (a hex can be "grassland with river")
- Provide fertility bonus to adjacent city hexes

### 2.5 Map Generation
- Procedural generation using multi-octave Simplex noise
- Elevation layer + moisture layer determine terrain type
- Island mask ensures ocean borders
- Continent validation ensures at least 2 landmasses
- Resource nodes placed on appropriate terrain (~60% coverage)

---

## 3. Resources

| Resource | Source | Usage |
|----------|--------|-------|
| Wood | Forest hexes | Buildings, boats, archers, chariots |
| Stone | Mountain hexes | City evolution, fortifications |
| Food | Grassland hexes, farms | Unit production, population growth |
| Metal | Hills hexes, mines | Military units (spearmen), advanced buildings |

Resources are gathered passively from city territory each turn, plus actively by worker units on resource nodes.

---

## 4. Cities

### 4.1 Founding
- Settlers found a new city (Camp) on any passable, unoccupied hex
- The settler is consumed when founding a city

### 4.2 Evolution Levels
| Level | Name | Pop Required | Resource Cost | Max Pop | Territory Radius |
|-------|------|-------------|---------------|---------|-----------------|
| 0 | Camp | - | - | 3 | 1 |
| 1 | Village | 3 | 20 Wood, 10 Stone | 7 | 2 |
| 2 | Town | 7 | 50 Wood, 30 Stone, 10 Metal | 15 | 3 |
| 3 | City | 15 | 100 Wood, 80 Stone, 40 Metal | 30 | 4 |

### 4.3 Population Growth
- Food stockpile accumulates each turn from city income
- Growth threshold: 10 + (current_population * 5) food
- When threshold reached, population increases by 1

### 4.4 Production
- Cities produce units and buildings from a queue
- Production speed is 1 turn at a time (each unit/building has a fixed turn cost)
- Only units unlocked by researched technologies are available

### 4.5 City Capture
- An enemy military unit on a city hex (with no defenders) captures the city
- Captured city: ownership transfers, level drops by 1 (min 0), population halved, queue cleared

---

## 5. Units

### 5.1 Unit Roster
| Unit | HP | ATK | DEF | Range | Move | Vision | Cost | Turns | Tech Required |
|------|----|-----|-----|-------|------|--------|------|-------|---------------|
| Worker | 5 | 1 | 1 | 1 | 2 | 2 | 20F | 3 | - |
| Settler | 3 | 0 | 0 | 0 | 2 | 2 | 50F | 5 | - |
| Scout | 8 | 3 | 2 | 1 | 4 | 4 | 15F | 2 | - |
| Spearman | 15 | 6 | 8 | 1 | 2 | 2 | 30F, 10M | 4 | Bronze Working |
| Archer | 10 | 8 | 3 | 2 | 2 | 3 | 25F, 15W | 4 | Archery |
| Chariot | 12 | 7 | 4 | 1 | 4 | 3 | 30F, 20W | 5 | The Wheel |
| Boat | 10 | 3 | 3 | 1 | 5 | 3 | 40W | 5 | Sailing |

(F=Food, W=Wood, M=Metal)

### 5.2 Unit Abilities
- **Worker**: Gather resources from resource nodes, build improvements (farms, mines, lumber camps)
- **Settler**: Found new cities (consumed on use)
- **Scout**: Fast exploration, cannot capture cities
- **Spearman**: Strong melee defense
- **Archer**: Ranged attack (2 hex range), no counter-damage when attacking at range
- **Chariot**: Fast melee unit, good for flanking
- **Boat**: Naval transport, can carry 1 land unit across ocean hexes; weak in combat

### 5.3 Movement
- Each unit has movement points per turn
- Movement costs vary by terrain (see terrain table)
- Land units cannot enter ocean hexes (must use boats)
- Boats can only move on ocean hexes
- A* pathfinding algorithm on the hex grid

---

## 6. Combat

### 6.1 Combat Resolution
Combat uses a combined system with multiple modifiers:

**Base Damage** = max(1, round((Attacker_ATK - Defender_DEF/2) * random(0.8 to 1.2)))

**Modifiers**:
- **Terrain Defense**: Defender gets terrain defense bonus (hills +2, forest +1, swamp -1)
- **Flanking**: +1 attack per friendly unit adjacent to the defender (max +5)
- **Tech Bonus**: Metalcasting gives +1 attack to all units
- **Ranged**: Archers attacking from range 2 take no counter-damage

**Counter-Damage** (melee only):
- Defender deals: max(1, round((Defender_DEF/2) * random(0.8 to 1.2)))
- Ranged attackers at range > 1 take no counter-damage

**Death**:
- Unit with HP <= 0 is removed from the game
- Melee attacker advances into defender's hex if defender dies

### 6.2 City Assault
- Military units can attack a city hex
- If all defending units are destroyed, the city is captured

---

## 7. Technology Tree

### 7.1 Overview
14 technologies across 3 branches: Economic, Military, Naval.
Research points generated per turn = sum of all city populations.

### 7.2 Tech Tree Layout
```
                    [Agriculture (20)]
                    /                \
    [Animal Husbandry (25)]     [Pottery (20)]
        /           \                  \
  [The Wheel (35)]  [Irrigation (30)]  [Masonry (30)]
      |                  \                  |
  [Chariot]         [Adv. Farming (40)]  [Fortification (45)]

  [Mining (25)] ---------> [Bronze Working (40)]
      \                          |
   [Sailing (35)]          [Metalcasting (50)]
       |
   [Shipbuilding (50)]

  [Archery (25)]  (standalone)
```

### 7.3 Tech Details
| Tech | Cost | Requires | Unlocks | Branch |
|------|------|----------|---------|--------|
| Agriculture | 20 | - | Farm improvement | Economic |
| Animal Husbandry | 25 | Agriculture | Scout upgrade | Economic |
| Pottery | 20 | Agriculture | Granary building | Economic |
| The Wheel | 35 | Animal Husbandry | Chariot unit | Military |
| Irrigation | 30 | Animal Husbandry | +1 food from farms | Economic |
| Masonry | 30 | Pottery | Walls building | Economic |
| Fortification | 45 | Masonry | Fortress building | Military |
| Mining | 25 | - | Mine improvement | Economic |
| Bronze Working | 40 | Mining | Spearman unit | Military |
| Metalcasting | 50 | Bronze Working | +1 attack all units | Military |
| Archery | 25 | - | Archer unit | Military |
| Sailing | 35 | Mining | Boat unit | Naval |
| Shipbuilding | 50 | Sailing | Improved boats | Naval |
| Advanced Farming | 40 | Irrigation | +2 food from farms | Economic |

---

## 8. AI System

### 8.1 Architecture
Utility-based decision making. Each possible action is scored 0-1, and the AI picks the highest-scoring action with some randomness based on difficulty.

### 8.2 Difficulty Levels
| Parameter | Easy | Medium | Hard |
|-----------|------|--------|------|
| Resource bonus | 0% | +10% | +25% |
| Combat modifier | -1 | 0 | +1 |
| Decision quality | 70% optimal | 85% optimal | 95% optimal |
| Vision bonus | 0 | +1 hex | +2 hex |

### 8.3 AI Behaviors
- **Explore**: Send scouts toward unexplored territory
- **Expand**: Found new cities in resource-rich areas
- **Develop**: Build workers, improvements, research technologies
- **Defend**: Position military near threatened cities
- **Attack**: Target vulnerable enemy cities and units
- **Retreat**: Pull back damaged units

---

## 9. Fog of War

Three configurable modes (selected at game setup):

| Mode | Description |
|------|-------------|
| None | Full map visibility for all players |
| Explored Only | Map starts hidden. Once explored by a unit, terrain is permanently revealed. Enemy units always visible on explored terrain. |
| Full Fog of War | Map starts hidden. Explored tiles show terrain but hide enemy units unless within current vision range. |

Vision range is per-unit (see unit stats). Cities also provide vision equal to their territory radius.

---

## 10. Victory Condition

**Conquest**: A player wins when the opponent has zero cities remaining.

---

## 11. Game Setup Options

Before starting a game, players configure:
- **Map Size**: Small / Medium / Large / Huge
- **Fog of War**: None / Explored Only / Full
- **AI Difficulty**: Easy / Medium / Hard
- **Player 1 Name**: Text input (default: "Player 1")
- **Player 2 Mode**: Human or AI
- **Player 2 Name**: Text input (default: "Player 2" or "AI")

---

## 12. Save/Load

- Save to Supabase database (cloud persistence)
- 10 save slots available
- Auto-save at the start of each human turn
- Save data includes: map, units, cities, resources, research progress, fog state, turn number, settings

---

## 13. UI Layout

- **Top bar (HUD)**: Player name/color, turn number, resource counts, End Turn button, Research button
- **Bottom-left**: Selection panel (info about selected hex/unit/city)
- **Bottom-right**: Minimap with camera viewport indicator
- **Center**: Hex map with camera pan (WASD/arrows) and zoom (mouse wheel)
- **Overlays**: Tech tree, city management, save/load menu
