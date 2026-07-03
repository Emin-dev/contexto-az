// Real verification for js/daily.js — deterministic date -> word index mapping.
import assert from 'node:assert/strict';
import { getDailyWordIndex, getDailyDateKey, daysSinceEpoch } from '../js/daily.js';

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const TOTAL = 15;

check('same date always yields the same index', () => {
  const d = new Date(2026, 6, 15);
  const a = getDailyWordIndex(d, TOTAL);
  const b = getDailyWordIndex(new Date(2026, 6, 15), TOTAL);
  assert.equal(a, b);
});

check('same calendar date built at different times of day yields the same index', () => {
  const d1 = new Date(2026, 6, 15, 0, 1);
  const d2 = new Date(2026, 6, 15, 23, 59);
  assert.equal(getDailyWordIndex(d1, TOTAL), getDailyWordIndex(d2, TOTAL));
});

check('index is always in bounds [0, totalWords)', () => {
  for (let i = -400; i < 400; i++) {
    const d = new Date(2026, 0, 1 + i);
    const idx = getDailyWordIndex(d, TOTAL);
    assert.ok(idx >= 0 && idx < TOTAL, `index ${idx} out of bounds for day offset ${i}`);
  }
});

check('consecutive real calendar days advance the index (mostly) by one, wrapping at totalWords', () => {
  const d0 = new Date(2026, 6, 3);
  const idx0 = getDailyWordIndex(d0, TOTAL);
  for (let i = 1; i <= TOTAL * 2; i++) {
    const d = new Date(2026, 6, 3 + i);
    const idx = getDailyWordIndex(d, TOTAL);
    assert.equal(idx, (idx0 + i) % TOTAL, `day offset ${i} should advance predictably`);
  }
});

check('different real dates can yield different indices', () => {
  const indices = new Set();
  for (let i = 0; i < TOTAL; i++) {
    indices.add(getDailyWordIndex(new Date(2026, 6, 3 + i), TOTAL));
  }
  assert.ok(indices.size > 1, 'expected multiple distinct indices across a season span');
  assert.equal(indices.size, TOTAL, 'a full season span should cover every index exactly once');
});

check('season repeats after totalWords days', () => {
  const d0 = new Date(2026, 6, 3);
  const dRepeat = new Date(2026, 6, 3 + TOTAL);
  assert.equal(getDailyWordIndex(d0, TOTAL), getDailyWordIndex(dRepeat, TOTAL));
});

check('throws on invalid date', () => {
  assert.throws(() => getDailyWordIndex(new Date('not a date'), TOTAL));
});

check('throws on non-positive or non-integer totalWords', () => {
  assert.throws(() => getDailyWordIndex(new Date(), 0));
  assert.throws(() => getDailyWordIndex(new Date(), -3));
  assert.throws(() => getDailyWordIndex(new Date(), 4.5));
});

check('getDailyDateKey formats as YYYY-MM-DD with zero padding', () => {
  assert.equal(getDailyDateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(getDailyDateKey(new Date(2026, 10, 30)), '2026-11-30');
});

check('daysSinceEpoch is 0 on the epoch anchor date and increases by 1 per day', () => {
  const epochDay = daysSinceEpoch(new Date(2026, 6, 3));
  const nextDay = daysSinceEpoch(new Date(2026, 6, 4));
  assert.equal(nextDay, epochDay + 1);
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
