/**
 * One-time generator: pulls the official 15-line Madani Mushaf layout from
 * Quran.com v4 (`verses/by_page/{n}?words=true&word_fields=line_number`) and
 * freezes it into src/quran/data/quranLines.json.
 *
 * Output format: { "s:a": [[page, startLine, endLine], ...] }
 * Ayaat that straddle a page boundary get one segment per page.
 *
 * Usage: node scripts/fetchQuranLines.mjs
 */
import { writeFileSync } from 'node:fs';

const TOTAL_PAGES = 604;
const OUT = 'src/quran/data/quranLines.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const spans = {}; // "s:a" -> [[page,start,end],...]

for (let page = 1; page <= TOTAL_PAGES; page++) {
  const url =
    `https://api.quran.com/api/v4/verses/by_page/${page}` +
    `?words=true&word_fields=line_number&fields=page_number&per_page=60`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`page ${page}: HTTP ${res.status}`);
  const data = await res.json();

  for (const verse of data.verses) {
    const lines = (verse.words || [])
      .map((w) => w.line_number)
      .filter((n) => Number.isFinite(n));
    if (lines.length === 0) continue;
    (spans[verse.verse_key] ||= []).push([page, Math.min(...lines), Math.max(...lines)]);
  }

  if (page % 50 === 0) console.log(`fetched ${page}/${TOTAL_PAGES}`);
  await sleep(60); // be polite to the API
}

const payload = {
  version: '1.0.0',
  source: 'Quran.com API v4 — KFGQPC Madani Mushaf (15 lines/page) word line_number',
  linesPerPage: 15,
  generatedAt: new Date().toISOString(),
  ayahLineSpans: spans,
};

writeFileSync(OUT, JSON.stringify(payload));
console.log(`done: ${Object.keys(spans).length} ayahs -> ${OUT}`);
