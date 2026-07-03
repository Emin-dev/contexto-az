// main.js — UI controller for Contexto AZ. Vanilla DOM, no framework.

import { WORDS } from './dataset.js';
import { getDailyWordIndex, getDailyDateKey } from './daily.js';
import { evaluateGuess, FAR_RANK } from './guess.js';
import {
  loadState,
  recordGuess,
  getBestGuess,
  getGuessesByCloseness,
  buildShareText,
  hasSupportPurchase,
  setSupportPurchased,
} from './state.js';
import { validateCard, submitSandboxPayment, getPriceUSD } from './checkout.js';

const now = new Date();
const todayIndex = getDailyWordIndex(now, WORDS.length);
const todayWord = WORDS[todayIndex];
let state = loadState(now);

const els = {
  dayLabel: document.getElementById('dayLabel'),
  guessForm: document.getElementById('guessForm'),
  guessInput: document.getElementById('guessInput'),
  guessSubmit: document.getElementById('guessSubmit'),
  guessHint: document.getElementById('guessHint'),
  bestGuess: document.getElementById('bestGuess'),
  bestGuessRow: document.getElementById('bestGuessRow'),
  winCard: document.getElementById('winCard'),
  winSummary: document.getElementById('winSummary'),
  shareBtn: document.getElementById('shareBtn'),
  guessCount: document.getElementById('guessCount'),
  historyList: document.getElementById('historyList'),
  emptyState: document.getElementById('emptyState'),

  howBtn: document.getElementById('howBtn'),
  howBackdrop: document.getElementById('howBackdrop'),
  howSheet: document.getElementById('howSheet'),
  closeHowBtn: document.getElementById('closeHowBtn'),

  menuBtn: document.getElementById('menuBtn'),
  menuBackdrop: document.getElementById('menuBackdrop'),
  menuSheet: document.getElementById('menuSheet'),
  closeMenuBtn: document.getElementById('closeMenuBtn'),
  supportBtn: document.getElementById('supportBtn'),
  priceLabel: document.getElementById('priceLabel'),
  archiveLocked: document.getElementById('archiveLocked'),
  archiveUnlocked: document.getElementById('archiveUnlocked'),
  archiveList: document.getElementById('archiveList'),

  checkoutBackdrop: document.getElementById('checkoutBackdrop'),
  checkoutSheet: document.getElementById('checkoutSheet'),
  closeCheckoutBtn: document.getElementById('closeCheckoutBtn'),
  cardNum: document.getElementById('cardNum'),
  cardExp: document.getElementById('cardExp'),
  cardCvc: document.getElementById('cardCvc'),
  checkoutError: document.getElementById('checkoutError'),
  confirmCheckoutBtn: document.getElementById('confirmCheckoutBtn'),
};

// Manual Azerbaijani date formatting — avoids depending on the browser's
// ICU/Intl locale data actually including 'az-AZ' month/weekday names,
// which is inconsistently available across browsers/OSes.
const AZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];
const AZ_WEEKDAYS = [
  'bazar', 'bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə',
];

function formatDateHuman(date) {
  const weekday = AZ_WEEKDAYS[date.getDay()];
  const month = AZ_MONTHS[date.getMonth()];
  return `${date.getDate()} ${month}, ${weekday}`;
}

function bandClass(rank) {
  if (rank === 1) return 'correct';
  if (rank <= 15) return 'hot';
  if (rank <= 50) return 'warm';
  if (rank <= 120) return 'cool';
  if (rank <= 250) return 'cold';
  return 'far';
}

function rankLabel(rank) {
  if (rank === 1) return '✓';
  if (rank >= FAR_RANK) return 'uzaq';
  return String(rank);
}

function renderGuessRow(container, guess, { best = false } = {}) {
  const row = document.createElement('div');
  row.className = 'guess-row' + (best ? ' guess-row--best' : '');
  row.style.setProperty('--row-color', `var(--band-${bandClass(guess.rank)})`);

  const word = document.createElement('span');
  word.className = 'guess-row-word';
  word.textContent = guess.guess;

  const rank = document.createElement('span');
  rank.className = 'guess-row-rank' + (guess.rank >= FAR_RANK ? ' is-far' : '');
  rank.textContent = rankLabel(guess.rank);

  row.appendChild(word);
  row.appendChild(rank);
  container.appendChild(row);
}

function renderAll() {
  els.dayLabel.textContent = formatDateHuman(now) + ` · Sezon 1 / Gün ${todayIndex + 1}`;

  const best = getBestGuess(state);
  if (best) {
    els.bestGuess.hidden = false;
    els.bestGuessRow.innerHTML = '';
    renderGuessRow(els.bestGuessRow, best, { best: true });
  } else {
    els.bestGuess.hidden = true;
  }

  els.guessCount.textContent = state.guesses.length
    ? `${state.guesses.length} təxmin`
    : '';

  els.historyList.innerHTML = '';
  const ordered = getGuessesByCloseness(state);
  if (ordered.length === 0) {
    els.emptyState.hidden = false;
  } else {
    els.emptyState.hidden = true;
    for (const g of ordered) {
      renderGuessRow(els.historyList, g);
    }
  }

  if (state.solved) {
    els.winCard.hidden = false;
    els.winSummary.textContent = `Gizli söz "${todayWord.word}" idi — ${state.solvedAtGuessCount} təxminə tapdın.`;
    els.guessForm.querySelector('.guess-input-row').hidden = true;
  } else {
    els.winCard.hidden = true;
    els.guessForm.querySelector('.guess-input-row').hidden = false;
  }
}

function handleGuessSubmit(e) {
  e.preventDefault();
  if (state.solved) return;

  const raw = els.guessInput.value;
  if (!raw || !raw.trim()) {
    els.guessHint.textContent = 'Əvvəlcə bir söz yaz.';
    els.guessHint.classList.add('is-error');
    return;
  }

  const result = evaluateGuess(raw, todayWord);
  state = recordGuess(result, now);
  els.guessInput.value = '';
  els.guessHint.classList.remove('is-error');

  if (result.correct) {
    els.guessHint.textContent = 'Düz tapdın!';
  } else if (!result.found) {
    els.guessHint.textContent = `"${result.guess.trim()}" — çox uzaqdır, siyahımızda tapılmadı.`;
  } else {
    els.guessHint.textContent = `"${result.guess.trim()}" — yaxınlıq: ${result.rank}`;
  }

  renderAll();
  els.guessInput.focus();
}

function handleShare() {
  const text = buildShareText(state, now);
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      els.shareBtn.textContent = 'Kopyalandı!';
      setTimeout(() => { els.shareBtn.textContent = 'Nəticəni paylaş'; }, 2000);
    }).catch(() => {
      window.prompt('Nəticəni kopyala:', text);
    });
  } else {
    window.prompt('Nəticəni kopyala:', text);
  }
}

// ---- Sheet open/close motion helper ----
// Sheets are shown/hidden via the `hidden` attribute (the actual visibility
// contract — see the [hidden] guard in style.css). The `sheet-enter` class
// only adds a starting transform/opacity for one frame right after `hidden`
// is removed, so the browser has something to transition *from* — it never
// changes whether the sheet is present, just how it appears. Closing skips
// the animation and hides immediately, since there's no exit transition
// wired to `hidden` (removing an attribute can't be "waited for").
function openSheet(backdrop, sheet) {
  backdrop.hidden = false;
  sheet.hidden = false;
  backdrop.classList.add('sheet-enter');
  sheet.classList.add('sheet-enter');
  // Force a style flush so the browser registers the "entering" state
  // before we remove it, otherwise both class changes coalesce into one
  // frame and no transition plays.
  void sheet.offsetHeight;
  requestAnimationFrame(() => {
    backdrop.classList.remove('sheet-enter');
    sheet.classList.remove('sheet-enter');
  });
}
function closeSheet(backdrop, sheet) {
  backdrop.hidden = true;
  sheet.hidden = true;
  backdrop.classList.remove('sheet-enter');
  sheet.classList.remove('sheet-enter');
}

// ---- "Necə işləyir?" sheet ----

function openHow() {
  openSheet(els.howBackdrop, els.howSheet);
}
function closeHow() {
  closeSheet(els.howBackdrop, els.howSheet);
}

// ---- Archive / support menu sheet ----

function renderArchive() {
  const unlocked = hasSupportPurchase();
  els.archiveLocked.hidden = unlocked;
  els.archiveUnlocked.hidden = !unlocked;
  if (!unlocked) return;

  els.archiveList.innerHTML = '';
  // Archive shows every past day of the current season (today and earlier),
  // most recent first. Only the word is shown — no spoilers about rank
  // history, since that's per-player and lives only in localStorage.
  for (let offset = 0; offset < WORDS.length; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const idx = getDailyWordIndex(d, WORDS.length);
    const item = document.createElement('div');
    item.className = 'archive-item';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'archive-item-date';
    dateSpan.textContent = getDailyDateKey(d);
    const wordSpan = document.createElement('span');
    wordSpan.className = 'archive-item-word';
    wordSpan.textContent = offset === 0 ? '(bu gün)' : WORDS[idx].word;
    item.appendChild(dateSpan);
    item.appendChild(wordSpan);
    els.archiveList.appendChild(item);
  }
}

function openMenu() {
  els.priceLabel.textContent = String(getPriceUSD());
  renderArchive();
  openSheet(els.menuBackdrop, els.menuSheet);
}
function closeMenu() {
  closeSheet(els.menuBackdrop, els.menuSheet);
}

// ---- Sandbox checkout ----

function openCheckout() {
  els.checkoutError.textContent = '';
  openSheet(els.checkoutBackdrop, els.checkoutSheet);
}
function closeCheckout() {
  closeSheet(els.checkoutBackdrop, els.checkoutSheet);
}

async function confirmCheckout() {
  const card = {
    number: els.cardNum.value,
    expiry: els.cardExp.value,
    cvc: els.cardCvc.value,
  };
  const { valid, errors } = validateCard(card);
  if (!valid) {
    els.checkoutError.textContent = Object.values(errors)[0];
    return;
  }

  const originalLabel = els.confirmCheckoutBtn.textContent;
  els.confirmCheckoutBtn.disabled = true;
  els.confirmCheckoutBtn.textContent = 'Yoxlanılır…';
  els.checkoutError.textContent = '';
  const result = await submitSandboxPayment(card);
  els.confirmCheckoutBtn.disabled = false;
  els.confirmCheckoutBtn.textContent = originalLabel;

  if (!result.ok) {
    els.checkoutError.textContent = result.message;
    return;
  }

  setSupportPurchased();
  closeCheckout();
  renderArchive();
}

// ---- Wire events ----

els.guessForm.addEventListener('submit', handleGuessSubmit);
els.shareBtn.addEventListener('click', handleShare);

els.howBtn.addEventListener('click', openHow);
els.closeHowBtn.addEventListener('click', closeHow);
els.howBackdrop.addEventListener('click', closeHow);

els.menuBtn.addEventListener('click', openMenu);
els.closeMenuBtn.addEventListener('click', closeMenu);
els.menuBackdrop.addEventListener('click', closeMenu);
els.supportBtn.addEventListener('click', openCheckout);

els.closeCheckoutBtn.addEventListener('click', closeCheckout);
els.checkoutBackdrop.addEventListener('click', closeCheckout);
els.confirmCheckoutBtn.addEventListener('click', confirmCheckout);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeHow();
    closeMenu();
    closeCheckout();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ---- Initial render ----

renderAll();
