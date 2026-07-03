// daily.js — deterministic mapping from a real calendar date to today's secret
// word index. Every player who opens the game on the same calendar day (in
// their own local time) sees the same puzzle; it advances automatically at
// local midnight. This is ordinary product code (not a workflow/build
// script), so using a real Date is correct and intended here.

// A fixed epoch anchor for "Season 1, Day 1". Chosen as the game's launch
// date. Using a fixed anchor (rather than Unix epoch) keeps the numbers small
// and readable, but the choice of anchor doesn't affect correctness — only
// which word lands on which day.
const EPOCH = Date.UTC(2026, 6, 3); // 2026-07-03 (months are 0-indexed)
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Return the number of whole calendar days between the epoch anchor and the
 * given date, using UTC calendar days so the result is stable regardless of
 * time-of-day or the caller's local timezone offset producing an off-by-one.
 * @param {Date} date
 * @returns {number}
 */
export function daysSinceEpoch(date) {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((utcMidnight - EPOCH) / MS_PER_DAY);
}

/**
 * Deterministically map a real calendar date to a stable secret-word index
 * in [0, totalWords). The same calendar day always yields the same index for
 * every player; the index advances by one (wrapping around) each new day, so
 * across `totalWords` consecutive days every word is used exactly once
 * before the season repeats.
 * @param {Date} date
 * @param {number} totalWords
 * @returns {number}
 */
export function getDailyWordIndex(date, totalWords) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('getDailyWordIndex requires a valid Date');
  }
  if (!Number.isInteger(totalWords) || totalWords <= 0) {
    throw new TypeError('getDailyWordIndex requires a positive integer totalWords');
  }
  const days = daysSinceEpoch(date);
  // JS % can return negative results for negative dividends (dates before the
  // epoch); normalize into [0, totalWords) so every date is always in bounds.
  return ((days % totalWords) + totalWords) % totalWords;
}

/**
 * Format a Date as a stable YYYY-MM-DD key (UTC calendar day), used to key
 * localStorage state per puzzle day.
 * @param {Date} date
 * @returns {string}
 */
export function getDailyDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
