/**
 * @file ArrayUtils.js
 * @description Array utility functions.
 * @version 0.2.0
 */

/**
 * Fisher-Yates shuffle (in-place).
 * @param {Array} array
 * @returns {Array} The same array, shuffled
 */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Pick a random element from an array.
 * @param {Array} array
 * @returns {*} Random element
 */
export function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Remove first occurrence of an item from an array (in-place).
 * @param {Array} array
 * @param {*} item
 * @returns {boolean} True if item was found and removed
 */
export function removeItem(array, item) {
  const index = array.indexOf(item);
  if (index !== -1) {
    array.splice(index, 1);
    return true;
  }
  return false;
}
