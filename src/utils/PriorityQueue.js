/**
 * @file PriorityQueue.js
 * @description Min-heap priority queue for A* pathfinding.
 * @version 0.2.0
 */

export class PriorityQueue {
  constructor() {
    /** @type {Array<{item: *, priority: number}>} */
    this._heap = [];
  }

  /** @returns {number} Number of items in the queue */
  get size() {
    return this._heap.length;
  }

  /** @returns {boolean} True if queue is empty */
  get isEmpty() {
    return this._heap.length === 0;
  }

  /**
   * Add an item with a priority (lower = higher priority).
   * @param {*} item
   * @param {number} priority
   */
  enqueue(item, priority) {
    this._heap.push({ item, priority });
    this._bubbleUp(this._heap.length - 1);
  }

  /**
   * Remove and return the item with the lowest priority.
   * @returns {*} The highest-priority item
   */
  dequeue() {
    if (this._heap.length === 0) return null;
    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._sinkDown(0);
    }
    return top.item;
  }

  /**
   * Peek at the highest-priority item without removing it.
   * @returns {*}
   */
  peek() {
    return this._heap.length > 0 ? this._heap[0].item : null;
  }

  /** @private */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this._heap[index].priority >= this._heap[parentIndex].priority) break;
      [this._heap[index], this._heap[parentIndex]] = [this._heap[parentIndex], this._heap[index]];
      index = parentIndex;
    }
  }

  /** @private */
  _sinkDown(index) {
    const length = this._heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this._heap[left].priority < this._heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this._heap[right].priority < this._heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;

      [this._heap[index], this._heap[smallest]] = [this._heap[smallest], this._heap[index]];
      index = smallest;
    }
  }
}
