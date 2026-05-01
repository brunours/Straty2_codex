/**
 * @file HexGrid.js
 * @description Static utility class for hex grid math.
 * Uses flat-top hexagons with axial coordinates (q, r).
 * Cube coordinates (q, r, s) where s = -q - r used for algorithms.
 * @version 0.2.0
 */

import { HEX_SIZE, HEX_DIRECTIONS } from '../config/constants.js';

export class HexGrid {
  /**
   * Convert offset coordinates (rectangular column/row storage) to axial.
   * Uses an odd-q vertical layout so the rendered map reads as a rectangle.
   * @param {number} col
   * @param {number} row
   * @returns {{q: number, r: number}}
   */
  static offsetToAxial(col, row) {
    return {
      q: col,
      r: row - Math.floor((col - (col & 1)) / 2)
    };
  }

  /**
   * Convert axial coordinates back to odd-q offset coordinates.
   * @param {number} q
   * @param {number} r
   * @returns {{col: number, row: number}}
   */
  static axialToOffset(q, r) {
    return {
      col: q,
      row: r + Math.floor((q - (q & 1)) / 2)
    };
  }

  /**
   * Convert axial (q, r) to cube (q, r, s).
   * @param {number} q
   * @param {number} r
   * @returns {{q: number, r: number, s: number}}
   */
  static axialToCube(q, r) {
    return { q, r, s: -q - r };
  }

  /**
   * Convert cube (q, r, s) to axial (q, r).
   * @param {number} q
   * @param {number} r
   * @param {number} s
   * @returns {{q: number, r: number}}
   */
  static cubeToAxial(q, r, s) {
    return { q, r };
  }

  /**
   * Convert axial coordinates to pixel position (center of hex).
   * Flat-top orientation.
   * @param {number} q
   * @param {number} r
   * @param {number} [size=HEX_SIZE]
   * @returns {{x: number, y: number}}
   */
  static axialToPixel(q, r, size = HEX_SIZE) {
    const x = size * (3 / 2 * q);
    const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return { x, y };
  }

  /**
   * Convert pixel position to fractional axial coordinates.
   * @param {number} x
   * @param {number} y
   * @param {number} [size=HEX_SIZE]
   * @returns {{q: number, r: number}}
   */
  static pixelToAxial(x, y, size = HEX_SIZE) {
    const q = (2 / 3 * x) / size;
    const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / size;
    return HexGrid.axialRound(q, r);
  }

  /**
   * Round fractional axial coordinates to nearest hex.
   * @param {number} q - Fractional q
   * @param {number} r - Fractional r
   * @returns {{q: number, r: number}}
   */
  static axialRound(q, r) {
    return HexGrid.cubeRound(q, r, -q - r);
  }

  /**
   * Round fractional cube coordinates to nearest hex.
   * @param {number} q
   * @param {number} r
   * @param {number} s
   * @returns {{q: number, r: number}}
   */
  static cubeRound(q, r, s) {
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);

    if (dq > dr && dq > ds) {
      rq = -rr - rs;
    } else if (dr > ds) {
      rr = -rq - rs;
    }
    // else rs = -rq - rr (not needed since we return axial)

    return { q: rq, r: rr };
  }

  /**
   * Hex distance between two axial coords (number of hex steps).
   * @param {number} q1
   * @param {number} r1
   * @param {number} q2
   * @param {number} r2
   * @returns {number}
   */
  static hexDistance(q1, r1, q2, r2) {
    const dq = q2 - q1;
    const dr = r2 - r1;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
  }

  /**
   * Get the 6 neighbor coordinates of a hex.
   * @param {number} q
   * @param {number} r
   * @returns {Array<{q: number, r: number}>}
   */
  static getNeighbors(q, r) {
    return HEX_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
  }

  /**
   * Get all hexes in a ring at a given radius.
   * @param {number} cq - Center q
   * @param {number} cr - Center r
   * @param {number} radius
   * @returns {Array<{q: number, r: number}>}
   */
  static hexRing(cq, cr, radius) {
    if (radius === 0) return [{ q: cq, r: cr }];

    const results = [];
    // Start at the hex radius steps in direction 4 (q: -1, r: 1)
    let q = cq + HEX_DIRECTIONS[4].q * radius;
    let r = cr + HEX_DIRECTIONS[4].r * radius;

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < radius; j++) {
        results.push({ q, r });
        q += HEX_DIRECTIONS[i].q;
        r += HEX_DIRECTIONS[i].r;
      }
    }
    return results;
  }

  /**
   * Get all hexes within a given radius (filled circle), including center.
   * @param {number} cq - Center q
   * @param {number} cr - Center r
   * @param {number} radius
   * @returns {Array<{q: number, r: number}>}
   */
  static hexSpiral(cq, cr, radius) {
    const results = [{ q: cq, r: cr }];
    for (let k = 1; k <= radius; k++) {
      results.push(...HexGrid.hexRing(cq, cr, k));
    }
    return results;
  }

  /**
   * Draw a line between two hexes (all hexes along the path).
   * @param {number} q1
   * @param {number} r1
   * @param {number} q2
   * @param {number} r2
   * @returns {Array<{q: number, r: number}>}
   */
  static hexLineDraw(q1, r1, q2, r2) {
    const dist = HexGrid.hexDistance(q1, r1, q2, r2);
    if (dist === 0) return [{ q: q1, r: r1 }];

    const results = [];
    const s1 = -q1 - r1;
    const s2 = -q2 - r2;

    for (let i = 0; i <= dist; i++) {
      const t = i / dist;
      const fq = q1 + (q2 - q1) * t;
      const fr = r1 + (r2 - r1) * t;
      const fs = s1 + (s2 - s1) * t;
      // Add small nudge to avoid edge cases at exact midpoints
      results.push(HexGrid.cubeRound(fq + 1e-6, fr + 1e-6, fs - 2e-6));
    }
    return results;
  }

  /**
   * Get the 6 corner pixel positions of a hex (flat-top).
   * @param {number} cx - Center pixel x
   * @param {number} cy - Center pixel y
   * @param {number} [size=HEX_SIZE]
   * @returns {Array<{x: number, y: number}>}
   */
  static getHexCorners(cx, cy, size = HEX_SIZE) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      corners.push({
        x: cx + size * Math.cos(angle),
        y: cy + size * Math.sin(angle)
      });
    }
    return corners;
  }

  /**
   * Create a string key from axial coordinates for use in Maps.
   * @param {number} q
   * @param {number} r
   * @returns {string}
   */
  static key(q, r) {
    return `${q},${r}`;
  }

  /**
   * Parse a hex key back to coordinates.
   * @param {string} key
   * @returns {{q: number, r: number}}
   */
  static parseKey(key) {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }
}
