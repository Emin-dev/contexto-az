// Real verification for js/guess.js — normalization + rank lookup behavior.
import assert from 'node:assert/strict';
import { normalizeGuess, evaluateGuess, FAR_RANK } from '../js/guess.js';

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

const sample = {
  word: 'ev',
  ranked: ['ev', 'mənzil', 'bina', 'daxma', 'köşk'],
};

check('normalizeGuess trims surrounding whitespace', () => {
  assert.equal(normalizeGuess('  ev  '), 'ev');
});

check('normalizeGuess collapses internal whitespace', () => {
  assert.equal(normalizeGuess('ev    salonu'), 'ev salonu');
});

check('normalizeGuess lowercases plain ASCII', () => {
  assert.equal(normalizeGuess('EV'), 'ev');
});

check('normalizeGuess handles Azerbaijani dotted/dotless I correctly (not naive ASCII lowercasing)', () => {
  // İ (dotted capital I) -> i (dotted lowercase i)
  assert.equal(normalizeGuess('İST'), 'ist');
  // I (dotless capital I, ASCII) -> ı (dotless lowercase i) per Azerbaijani/Turkish casing
  assert.equal(normalizeGuess('IŞIQ'), 'ışıq');
});

check('normalizeGuess preserves other Azerbaijani special characters', () => {
  assert.equal(normalizeGuess('ÇÖRƏK'), 'çörək');
  assert.equal(normalizeGuess('AĞAC'), 'ağac');
  assert.equal(normalizeGuess('ŞƏHƏR'), 'şəhər');
  assert.equal(normalizeGuess('GÜNƏŞ'), 'günəş');
});

check('normalizeGuess returns empty string for non-string input', () => {
  assert.equal(normalizeGuess(undefined), '');
  assert.equal(normalizeGuess(null), '');
  assert.equal(normalizeGuess(42), '');
});

check('evaluateGuess detects the correct secret word (case/whitespace-insensitive)', () => {
  const r = evaluateGuess('  EV ', sample);
  assert.equal(r.correct, true);
  assert.equal(r.found, true);
  assert.equal(r.rank, 1);
});

check('evaluateGuess looks up correct rank (1-indexed) for a ranked word', () => {
  const r = evaluateGuess('bina', sample);
  assert.equal(r.correct, false);
  assert.equal(r.found, true);
  assert.equal(r.rank, 3); // index 2 -> rank 3
});

check('evaluateGuess is case/whitespace-insensitive for ranked lookups too', () => {
  const r = evaluateGuess('  MƏNZİL ', sample);
  assert.equal(r.found, true);
  assert.equal(r.rank, 2);
});

check('evaluateGuess reports FAR_RANK (not rank 0, not a crash) for unmatched guesses', () => {
  const r = evaluateGuess('kompüter', sample);
  assert.equal(r.correct, false);
  assert.equal(r.found, false);
  assert.equal(r.rank, FAR_RANK);
  assert.ok(r.rank > 0);
});

check('evaluateGuess handles empty-string guesses without crashing', () => {
  const r = evaluateGuess('   ', sample);
  assert.equal(r.correct, false);
  assert.equal(r.found, false);
  assert.equal(r.rank, FAR_RANK);
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
