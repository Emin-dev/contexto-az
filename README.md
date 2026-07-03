# Contexto AZ — Contexto amma Azərbaycanca

A daily semantic word-guessing game in Azerbaijani, in the style of
[Contexto](https://contexto.me): a secret word is chosen for the day, and
every guess is scored by how semantically/thematically close it is to that
word — 1 is the secret word itself; higher numbers are further away.

**Live app:** https://emin-dev.github.io/contexto-az/

## Why this needed an honest workaround

A real Contexto-style game normally scores guesses using a word-embedding
model. There is no live ML/embedding API in this build's environment, and
faking a "real ML pipeline" — or silently guessing rankings from pure
memory without real sourcing — would be dishonest, especially for a
lower-resource language like Azerbaijani where good embeddings are scarce.

Instead, this game ships **Season 1: exactly 15 hand-curated secret words**
(not a fake claim of 365 days of content). For each word, a ranked list of
roughly 150–250 related Azerbaijani words was authored with AI assistance
and cross-checked, where possible, against real Azerbaijani reference
material via web search — synonym dictionaries, izahlı lüğət (explanatory
dictionary) entries, thematic word-group resources, and Wiktionary
Azerbaijani entries.

**This data has NOT been validated by a native Azerbaijani speaker.** That
limitation is stated plainly in the app's "Necə işləyir?" panel, along with
a link to open a GitHub issue for any ranking that looks wrong. See
[js/dataset.js](js/dataset.js) for the full per-word source note, and the
bottom of this file for exactly how much of each list was search-verified
vs. reasoned from general knowledge.

## The 15 Season 1 words

ev (house), su (water), çörək (bread), kitab (book), günəş (sun), dəniz
(sea), alma (apple), pişik (cat), it (dog), maşın (car), şəhər (city), ağac
(tree), quş (bird), dost (friend), məktəb (school).

The daily word is chosen deterministically from the calendar date
(`js/daily.js`), so every player sees the same word on the same day, and
the season loops after 15 days.

## How it's monetized — BUY (one-time), sandbox only

- **Model:** BUY — a single one-time "dəstək ol / support the game"
  payment. Not a subscription.
- **Price:** $3 USD, paid once.
- **What's free, always:** today's puzzle. There is no paywall on the daily
  game — everyone can play every day's word for free, forever.
- **What's paid:** access to the past-days archive and a personal stats
  view. This is a discretionary support purchase, not "remove ads" — this
  product has no ads and never will (Studio's hard no-ads rule).
- **Sandbox status:** `js/checkout.js` is a fully simulated demo payment
  flow. No real payment processor is integrated and no money ever changes
  hands. It performs client-side Luhn/expiry/CVC format checks and a fake
  network delay, then resolves success/decline. The well-known test card
  `4000 0000 0000 0002` always simulates a decline so the failure path is
  demonstrable. The checkout view is labeled "SANDBOX REJİMİ — real ödəniş
  alınmayacaq."

## Design

No timers, no fail state, no streaks, no guilt-based notifications. You can
think as long as you want; there's no penalty for guessing a lot. Mobile-
first, calm/warm visual style shared with other Studio products (Mood Nook).

## Tech

Vanilla JS ES modules, zero dependencies, no build step.

- `js/dataset.js` — the 15 secret words with their ranked relatedness arrays.
- `js/daily.js` — deterministic real-`Date` → daily word index mapping.
- `js/guess.js` — Azerbaijani-aware guess normalization (correctly handles
  İ/ı and other diacritics, not naive ASCII lowercasing) and rank lookup.
  Unranked guesses report a fixed "very far" result rather than crashing or
  defaulting to rank 0.
- `js/state.js` — localStorage-backed per-day guess history, best-guess
  tracking, and a Wordle-style shareable emoji-grid result string that
  reveals only guess count and closeness color bands — never the secret
  word or other players' data.
- `js/checkout.js` — sandbox-only payment simulation (see Monetization).
- `js/main.js` — DOM controller wiring the guess form, history list, win
  state, share button, and checkout modal.
- `sw.js` / `manifest.webmanifest` — installable, offline-capable PWA
  (cache-first, versioned `CACHE_VERSION`).

## Tests

Real, assertion-based Node test files (no test runner dependency):

```bash
node test/daily.test.mjs
node test/guess.test.mjs
node test/dataset.test.mjs
node test/checkout.test.mjs
```

`dataset.test.mjs` is an integrity check on the hand-curated word lists:
exactly 15 words, each word's own list starting with itself, no duplicates
within a list, sane length (150–250), and a charset check that every entry
looks like real Azerbaijani text (catches stray acronyms/typos — it already
caught and removed a couple of curation mistakes, e.g. an accidentally
included "İSBN" and "H2O").

## Local development

```bash
node server.mjs   # serves the app at http://127.0.0.1:8088
```

(`server.mjs` is a local-only static file server, excluded from git via
`.gitignore` — a development convenience, not part of the shipped product.)

## Data-quality honesty note (per-word)

All 15 word lists were produced by AI research agents that ran real web
searches against Azerbaijani-language sources (synonym dictionaries,
izahlı lüğət entries, Wiktionary, thematic word-group pages, and in a few
cases direct Wikipedia/Wiktionary page fetches) and used those results to
build and order each ranked list, rather than inventing lists from pure
recall. A post-hoc review pass then removed several entries the curation
process itself flagged as uncertain or wrong, including:

- A stray non-word entry in the "su" (water) list that was actually
  "son-in-law" (a curation mistake, misplaced next to a river name).
- An acronym ("İSBN") and a chemical formula ("H2O") that aren't Azerbaijani
  words in the ordinary sense, found in the "kitab" and "su" lists.
- A handful of agent-invented diminutive/compound forms in the "pişik"
  (cat) and "it" (dog) lists that weren't confirmed against any real source.

Despite that review pass, this is still fundamentally **AI-assisted,
AI-reviewed data that has not been checked by a native Azerbaijani
speaker**. Some rankings will be debatable or simply wrong. If you notice
one, please open an issue: https://github.com/Emin-dev/contexto-az/issues/new
