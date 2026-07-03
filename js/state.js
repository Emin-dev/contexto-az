// state.js — tracks today's guesses in localStorage, keyed by calendar date
// so progress resets naturally each day without any explicit "reset" logic.
// Falls back to an in-memory store when localStorage is unavailable (e.g.
// private-browsing edge cases, or when running under Node for tests), so the
// game degrades gracefully rather than throwing.

import { getDailyDateKey } from './daily.js';

const STORAGE_PREFIX = 'contexto-az:v1:';

function memoryStore() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function getStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const testKey = `${STORAGE_PREFIX}__probe__`;
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return localStorage;
    }
  } catch {
    // localStorage may throw in some sandboxed/private-mode contexts.
  }
  if (!getStorage._fallback) getStorage._fallback = memoryStore();
  return getStorage._fallback;
}

function keyFor(dateKey) {
  return `${STORAGE_PREFIX}${dateKey}`;
}

function emptyState() {
  return {
    guesses: [], // [{ guess, normalized, rank, correct }]
    solved: false,
    solvedAtGuessCount: null,
  };
}

/**
 * Load today's game state for the given date (defaults to now).
 * @param {Date} [date]
 * @returns {{guesses: object[], solved: boolean, solvedAtGuessCount: number|null}}
 */
export function loadState(date = new Date()) {
  const storage = getStorage();
  const raw = storage.getItem(keyFor(getDailyDateKey(date)));
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.guesses)) return emptyState();
    return {
      guesses: parsed.guesses,
      solved: Boolean(parsed.solved),
      solvedAtGuessCount: parsed.solvedAtGuessCount ?? null,
    };
  } catch {
    return emptyState();
  }
}

function saveState(state, date = new Date()) {
  const storage = getStorage();
  storage.setItem(keyFor(getDailyDateKey(date)), JSON.stringify(state));
}

/**
 * Record a new guess result into today's state and persist it.
 * @param {{normalized: string, rank: number, correct: boolean, guess: string}} guessResult
 * @param {Date} [date]
 * @returns {object} the updated state
 */
export function recordGuess(guessResult, date = new Date()) {
  const state = loadState(date);

  // Avoid double-counting an identical repeated guess (same normalized word).
  const already = state.guesses.some((g) => g.normalized === guessResult.normalized);
  if (!already) {
    state.guesses.push({
      guess: guessResult.guess,
      normalized: guessResult.normalized,
      rank: guessResult.rank,
      correct: guessResult.correct,
    });
  }

  if (guessResult.correct && !state.solved) {
    state.solved = true;
    state.solvedAtGuessCount = state.guesses.length;
  }

  saveState(state, date);
  return state;
}

/**
 * The closest (lowest-rank) guess made so far, or null if no guesses yet.
 * @param {object} state
 * @returns {object|null}
 */
export function getBestGuess(state) {
  if (!state.guesses.length) return null;
  return state.guesses.reduce((best, g) => (g.rank < best.rank ? g : best), state.guesses[0]);
}

/**
 * Guesses ordered closest-first (lowest rank first). Ties keep original
 * (chronological) order.
 * @param {object} state
 * @returns {object[]}
 */
export function getGuessesByCloseness(state) {
  return [...state.guesses]
    .map((g, i) => ({ ...g, _i: i }))
    .sort((a, b) => a.rank - b.rank || a._i - b._i)
    .map(({ _i, ...g }) => g);
}

// Closeness color bands for share-grid rendering. Lower rank = closer.
// Bands are deliberately coarse so the share string never leaks the exact
// rank of any single guess, only a rough closeness impression.
const BANDS = [
  { max: 1, emoji: '🟩' }, // the word itself (solved guess)
  { max: 15, emoji: '🟢' },
  { max: 50, emoji: '🟡' },
  { max: 120, emoji: '🟠' },
  { max: 250, emoji: '🔴' },
  { max: Infinity, emoji: '⬛' },
];

function bandEmoji(rank) {
  return BANDS.find((b) => rank <= b.max).emoji;
}

/**
 * Build a Wordle-style shareable result string. Reveals only the puzzle
 * day, guess count, and a closeness color band per guess (chronological
 * order) — never the secret word, never other players' data.
 * @param {object} state
 * @param {Date} [date]
 * @param {object} [opts]
 * @param {string} [opts.appName]
 * @returns {string}
 */
export function buildShareText(state, date = new Date(), opts = {}) {
  const appName = opts.appName || 'Contexto AZ';
  const dateKey = getDailyDateKey(date);
  if (!state.solved) {
    const grid = state.guesses.map((g) => bandEmoji(g.rank)).join('');
    return `${appName} — ${dateKey}\n${state.guesses.length} təxmin, hələ tapılmayıb\n${grid}`.trim();
  }
  const grid = state.guesses.map((g) => bandEmoji(g.rank)).join('');
  return `${appName} — ${dateKey}\n${state.solvedAtGuessCount} təxminə tapdım! ✅\n${grid}`.trim();
}

// ---- Support-purchase flag (unlocks the archive + stats page) ----
// A single sandbox flag, not keyed by day — mirrors the one-time "BUY"
// nature of the purchase (see js/checkout.js). Never touched by real money;
// only ever set by a successful (sandbox) checkout confirmation.

const SUPPORT_KEY = `${STORAGE_PREFIX}support-purchased`;

/**
 * Whether the player has completed the sandbox "support the game" purchase.
 * @returns {boolean}
 */
export function hasSupportPurchase() {
  return getStorage().getItem(SUPPORT_KEY) === 'true';
}

/**
 * Mark the sandbox support purchase as complete (called after a successful
 * submitSandboxPayment result — never call this from a declined payment).
 */
export function setSupportPurchased() {
  getStorage().setItem(SUPPORT_KEY, 'true');
}
