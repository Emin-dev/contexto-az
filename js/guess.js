// guess.js — normalizes raw player input and looks up its semantic rank
// within the current secret word's ranked relatedness array.

// Azerbaijani-aware lowercasing. JS's default String.toLowerCase() already
// handles Turkish/Azerbaijani dotted/dotless I correctly when a locale is
// supplied, but the default (locale-less) toLowerCase() run in some engines
// can mishandle 'İ' -> should become 'i' (dotted lowercase i), and plain
// ASCII-only lowercasing would wrongly map it or leave it untouched. We use
// toLocaleLowerCase('az') which the ECMAScript Intl-backed implementations
// resolve correctly (İ -> i, I -> ı are Turkish/Azerbaijani-specific casing
// rules); as a defensive belt-and-braces measure we also explicitly map the
// two characters most commonly mishandled by naive ASCII lowercasing.
export function normalizeGuess(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  // Explicit, deterministic pre-map for the two casing pitfalls specific to
  // Azerbaijani/Turkish before handing off to locale lowercasing, so behavior
  // doesn't depend on the JS engine's ICU data being present.
  s = s.replace(/İ/g, 'i').replace(/I/g, 'ı');
  try {
    s = s.toLocaleLowerCase('az');
  } catch {
    s = s.toLowerCase();
  }
  // Collapse internal whitespace runs (e.g. accidental double spaces from
  // mobile keyboards) to a single space, and trim again just in case.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Any guess ranked beyond the curated list is reported as this fixed "very
// far" rank rather than crashing or silently defaulting to 0 (which would
// wrongly imply the guess is the secret word itself).
export const FAR_RANK = 1000;

/**
 * Look up a normalized guess against a word entry's ranked relatedness array.
 * @param {string} rawGuess - the player's raw input
 * @param {{word: string, ranked: string[]}} wordEntry - today's secret word entry
 * @returns {{
 *   guess: string,
 *   normalized: string,
 *   correct: boolean,
 *   found: boolean,
 *   rank: number,
 * }}
 */
export function evaluateGuess(rawGuess, wordEntry) {
  const normalized = normalizeGuess(rawGuess);
  const secretNormalized = normalizeGuess(wordEntry.word);
  const correct = normalized === secretNormalized && normalized.length > 0;

  if (correct) {
    return { guess: rawGuess, normalized, correct: true, found: true, rank: 1 };
  }

  const idx = wordEntry.ranked.findIndex((w) => normalizeGuess(w) === normalized);
  if (idx === -1) {
    return { guess: rawGuess, normalized, correct: false, found: false, rank: FAR_RANK };
  }
  return { guess: rawGuess, normalized, correct: false, found: true, rank: idx + 1 };
}
