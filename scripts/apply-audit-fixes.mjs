// One-off script: apply the adversarial audit's confirmed fixes to dataset.js.
// Run with: node scripts/apply-audit-fixes.mjs
// Reads js/dataset.js, applies per-word remove/replace edits, verifies no
// duplicates or out-of-bounds lengths result, then rewrites the file in the
// same hand-authored style (word-wrapped, ~10 entries per line).

import { WORDS } from '../js/dataset.js';
import { writeFileSync } from 'node:fs';

const FIXES = {
  ev: {
    remove: ['zaval', 'hovli', 'mənzil-villa', 'ambar'],
    replace: { sükunet: 'sükunət', meymar: 'memar' },
  },
  su: {
    remove: ['yaraq', 'dumaq'],
    replace: {},
  },
  çörək: { remove: [], replace: {} },
  kitab: {
    remove: ['cəld'],
    replace: { topluq: 'toplu' },
  },
  günəş: {
    remove: ['gölgə', 'səma nurunu saçan'],
    replace: { aftab: 'əftab', 'günəş takvimi': 'günəş təqvimi', 'vitamin D': 'D vitamini' },
  },
  dəniz: {
    remove: ['sual', 'suitü', 'körpücük'],
    replace: { planktonu: 'plankton' },
  },
  // alma's first audit attempt returned a broken placeholder result, so a
  // fresh re-audit agent ran separately; its 2 confirmed fixes were applied
  // directly to dataset.js by hand (identical in effect to running this
  // script would have been) rather than by re-running this file, since the
  // other 14 words' fixes below had already been baked into dataset.js by
  // the time the re-audit came back. Recorded here as an empty no-op entry
  // so this script stays safely re-runnable against the current file state.
  alma: { remove: [], replace: {} }, // "alma pdöresi" -> "alma pürəsi", "şirket" -> "şirkət" (both applied by hand)
  pişik: {
    remove: [],
    replace: {
      tovuz: 'tovuzquşu',
      siçanovlayan: 'siçan ovlayan',
      'pişik zolu': 'pişik qumu',
      'pişik maması': 'pişik yemi',
      'vahşi pişik': 'vəhşi pişik',
      'pişik yalağı': 'pişik qabı',
    },
  },
  it: {
    remove: ['çobankopek', 'kimyaçı'],
    replace: { çixixua: 'çixuaxua', terer: 'teriyer', haski: 'xaski', sürüçülük: 'çobanlıq' },
  },
  maşın: { remove: [], replace: {} }, // soft flag only, not a concrete error — left as-is
  şəhər: {
    remove: ['mahalla', 'sakinlik', 'svetofor'],
    replace: { megapolis: 'meqapolis' },
  },
  ağac: {
    remove: ['şən', 'koloğıc', 'peçenək', 'sancaqlı'],
    replace: {},
  },
  quş: {
    remove: ['tənbəl quş', 'durbin', 'cücərmə'],
    replace: { zooparku: 'zoopark', cücükabab: 'cücə kababı' },
  },
  dost: { remove: [], replace: {} },
  məktəb: {
    remove: ['distant təhsil'],
    replace: { partaq: 'parta' },
  },
};

const report = [];

for (const entry of WORDS) {
  const fix = FIXES[entry.word];
  if (!fix) throw new Error(`No fix entry (even empty) declared for word "${entry.word}" — every word must be explicitly accounted for.`);

  const before = entry.ranked.length;

  for (const oldWord of fix.remove) {
    const idx = entry.ranked.indexOf(oldWord);
    if (idx === -1) throw new Error(`[${entry.word}] cannot remove "${oldWord}" — not found in ranked array (already fixed manually? check FIXES).`);
    entry.ranked.splice(idx, 1);
    report.push(`[${entry.word}] removed "${oldWord}"`);
  }

  for (const [oldWord, newWord] of Object.entries(fix.replace)) {
    const idx = entry.ranked.indexOf(oldWord);
    if (idx === -1) throw new Error(`[${entry.word}] cannot replace "${oldWord}" -> "${newWord}" — "${oldWord}" not found.`);
    if (entry.ranked.includes(newWord)) {
      throw new Error(`[${entry.word}] cannot replace "${oldWord}" -> "${newWord}" — "${newWord}" already exists in this word's list (would create a duplicate). Resolve manually.`);
    }
    entry.ranked[idx] = newWord;
    report.push(`[${entry.word}] replaced "${oldWord}" -> "${newWord}"`);
  }

  // Post-fix integrity checks (mirrors test/dataset.test.mjs expectations)
  if (entry.ranked[0] !== entry.word) throw new Error(`[${entry.word}] rank 1 is no longer the secret word itself after edits.`);
  const seen = new Set();
  for (const w of entry.ranked) {
    if (seen.has(w)) throw new Error(`[${entry.word}] duplicate entry "${w}" present after edits.`);
    seen.add(w);
  }
  if (entry.ranked.length < 150 || entry.ranked.length > 250) {
    throw new Error(`[${entry.word}] length ${entry.ranked.length} out of the 150-250 bounds after edits.`);
  }

  const after = entry.ranked.length;
  report.push(`[${entry.word}] length ${before} -> ${after}`);
}

// ---- Re-serialize dataset.js in the same hand-authored style ----

function wrapRankedArray(words, indent = '      ') {
  const lines = [];
  let line = indent;
  for (let i = 0; i < words.length; i++) {
    const piece = JSON.stringify(words[i]) + (i < words.length - 1 ? ', ' : ',');
    if (line.length + piece.length > 95 && line.trim().length > 0) {
      lines.push(line.replace(/\s+$/, ''));
      line = indent;
    }
    line += piece;
  }
  if (line.trim().length > 0) lines.push(line.replace(/\s+$/, ''));
  return lines.join('\n');
}

const header = `// dataset.js — Season 1 hand-curated word-relatedness dataset.
//
// Each entry's \`ranked\` array orders ~150-250 Azerbaijani words from most to
// least semantically/thematically related to the secret word. Index 0 is
// always the secret word itself (rank 1). This data was authored with AI
// assistance and cross-checked against real Azerbaijani reference material
// (izahli lugat / explanatory dictionary entries, synonym dictionaries,
// thematic word-group resources, Wiktionary Azerbaijani entries) via web
// search where possible. A follow-up adversarial audit (also AI-run, also
// WebSearch-cross-checked) then reviewed every list for misspellings,
// fabricated words, and wrongly-placed entries and corrected what it found —
// see PROGRESS.md in the Studio hub for the full list of fixes applied. It
// has still NOT been validated by a native Azerbaijani speaker. See the
// in-app "Nece isleyir?" panel and README.md for the full honest caveat and
// a link to report bad rankings.
`;

const body = WORDS.map((entry) => {
  return `  {\n    word: ${JSON.stringify(entry.word)},\n    ranked: [\n${wrapRankedArray(entry.ranked)}\n    ],\n  },`;
}).join('\n');

const output = `${header}\nexport const WORDS = [\n${body}\n];\n`;

writeFileSync(new URL('../js/dataset.js', import.meta.url), output);

console.log(report.join('\n'));
console.log(`\n${report.length} change(s)/checks logged. dataset.js rewritten.`);
