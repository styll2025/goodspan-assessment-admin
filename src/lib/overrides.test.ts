import { describe, expect, it } from 'vitest';
import { normalizeSwapRecord } from './overrides';

describe('normalizeSwapRecord', () => {
  it('keeps legacy string swaps and object swaps', () => {
    expect(normalizeSwapRecord({
      'r1:0': 'Leave your phone outside the bed — not in it or under the pillow.',
      'r1:1': { category: 'Screentime', text: 'Create a 30min to 1 hour screen-free wind-down before bed.' },
      'r1:2': { text: 'missing category still works' },
      'r1:3': 12,
    })).toEqual({
      'r1:0': { category: '', text: 'Leave your phone outside the bed — not in it or under the pillow.' },
      'r1:1': { category: 'Screentime', text: 'Create a 30min to 1 hour screen-free wind-down before bed.' },
      'r1:2': { category: '', text: 'missing category still works' },
    });
  });
});
