/**
 * @file SimplexNoise.js
 * @description Simplex noise implementation for procedural map generation.
 * Based on Stefan Gustavson's SimplexNoise implementation.
 * @version 0.2.0
 */

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

const GRAD3 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, 1], [1, -1], [-1, -1]
];

export class SimplexNoise {
  /**
   * Create a new SimplexNoise generator.
   * @param {number} [seed] - Optional seed for reproducible noise
   */
  constructor(seed) {
    this._perm = new Uint8Array(512);
    this._permMod12 = new Uint8Array(512);

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Seed-based shuffle
    if (seed !== undefined) {
      let s = seed;
      for (let i = 255; i > 0; i--) {
        s = (s * 16807 + 0) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
      }
    } else {
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
      }
    }

    for (let i = 0; i < 512; i++) {
      this._perm[i] = p[i & 255];
      this._permMod12[i] = this._perm[i] % 12;
    }
  }

  /**
   * Get 2D simplex noise value.
   * @param {number} x
   * @param {number} y
   * @returns {number} Value in range [-1, 1]
   */
  noise2D(x, y) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;

    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = this._permMod12[ii + this._perm[jj]];
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = this._permMod12[ii + i1 + this._perm[jj + j1]];
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = this._permMod12[ii + 1 + this._perm[jj + 1]];
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
    }

    // Scale to [−1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Get multi-octave noise (fractal brownian motion).
   * @param {number} x
   * @param {number} y
   * @param {number} [octaves=4] - Number of noise layers
   * @param {number} [lacunarity=2.0] - Frequency multiplier per octave
   * @param {number} [persistence=0.5] - Amplitude multiplier per octave
   * @returns {number} Value in approximate range [0, 1]
   */
  fractal(x, y, octaves = 4, lacunarity = 2.0, persistence = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // Normalize to [0, 1]
    return (value / maxValue + 1) / 2;
  }
}
