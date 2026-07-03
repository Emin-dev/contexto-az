// Real verification for js/dataset.js — integrity checks on the hand-curated
// word-relatedness dataset. These checks guard against the most likely real
// mistakes when hand-authoring 15 large ranked lists: wrong count, secret
// word not at rank 1, accidental duplicates, lists that are too short/long,
// or entries containing characters that aren't plausible Azerbaijani text.
import assert from 'node:assert/strict';
import { WORDS } from '../js/dataset.js';

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

const MIN_LEN = 150;
const MAX_LEN = 250;

// Azerbaijani Latin alphabet (letters actually used in Azerbaijani words),
// plus space and hyphen for the rare multi-word entry. Deliberately excludes
// q/w/x-less-common-combos judgment calls — Azerbaijani's alphabet does
// include q, x, w is NOT part of it. We allow the full real alphabet:
// a b c ç d e ə f g ğ h x ı i j k q l m n o ö p r s ş t u ü v y z
const AZ_WORD_RE = /^[a-zçəğıöşü\s-]+$/i;

check('exactly 15 words', () => {
  assert.equal(WORDS.length, 15, `expected 15 words, got ${WORDS.length}`);
});

check('no duplicate secret words across the dataset', () => {
  const seen = new Set();
  for (const entry of WORDS) {
    assert.ok(!seen.has(entry.word), `duplicate secret word: ${entry.word}`);
    seen.add(entry.word);
  }
});

for (const entry of WORDS) {
  check(`[${entry.word}] ranked[0] === word (secret word is rank 1)`, () => {
    assert.equal(entry.ranked[0], entry.word);
  });

  check(`[${entry.word}] ranked length is within 150-250`, () => {
    assert.ok(
      entry.ranked.length >= MIN_LEN && entry.ranked.length <= MAX_LEN,
      `length ${entry.ranked.length} out of range for "${entry.word}"`
    );
  });

  check(`[${entry.word}] no duplicate entries within its own ranked list`, () => {
    const seen = new Set();
    const dupes = [];
    for (const w of entry.ranked) {
      const norm = w.toLocaleLowerCase('az');
      if (seen.has(norm)) dupes.push(w);
      seen.add(norm);
    }
    assert.equal(dupes.length, 0, `duplicates in "${entry.word}": ${dupes.join(', ')}`);
  });

  check(`[${entry.word}] every entry looks like a real Azerbaijani word (charset check)`, () => {
    const bad = entry.ranked.filter((w) => !AZ_WORD_RE.test(w));
    assert.equal(bad.length, 0, `suspicious entries in "${entry.word}": ${bad.join(', ')}`);
  });

  check(`[${entry.word}] no empty or whitespace-only entries`, () => {
    const bad = entry.ranked.filter((w) => w.trim().length === 0);
    assert.equal(bad.length, 0, `empty entries found in "${entry.word}"`);
  });
}

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSOME CHECKS FAILED');
  process.exit(1);
} else {
  console.log('\nALL CHECKS PASSED');
}
