#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');
const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG  — edit here to change target, date cutoff, or save threshold
// ═══════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  username:       'khairulaming',
  cutoffISO:      '2025-01-01T00:00:00+08:00',   // Malaysia time (UTC+8)
  minSaves:       100_000,
  outputFile:     path.join(__dirname, 'khairulaming_100k_saves.csv'),
  rawDir:         path.join(__dirname, 'raw'),
  profileDir:     path.join(__dirname, 'browser-profile'),
  scrollDelayMin: 1500,   // ms between scrolls (min)
  scrollDelayMax: 3000,   // ms between scrolls (max)
};
// ═══════════════════════════════════════════════════════════════════════════════

const PROFILE_URL = `https://www.tiktok.com/@${CONFIG.username}`;
const CUTOFF_UNIX = Math.floor(new Date(CONFIG.cutoffISO).getTime() / 1000);  // seconds

// ── tiny utilities ────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function randomDelay() {
  const lo = CONFIG.scrollDelayMin, hi = CONFIG.scrollDelayMax;
  return sleep(Math.floor(Math.random() * (hi - lo + 1)) + lo);
}

function toNum(v) {
  if (v == null) return 0;
  const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : Number(v);
  return isNaN(n) ? 0 : n;
}

// TikTok-style formatting: 134502 → "134.5K", 2100000 → "2.1M", 100000 → "100K"
function fmtCount(n) {
  if (n >= 1_000_000) {
    const v = +(n / 1_000_000).toFixed(1);
    return (Number.isInteger(v) ? String(Math.round(v)) : String(v)) + 'M';
  }
  if (n >= 1_000) {
    const v = +(n / 1_000).toFixed(1);
    return (Number.isInteger(v) ? String(Math.round(v)) : String(v)) + 'K';
  }
  return String(n);
}

function csvCell(val) {
  const s = String(val ?? '');
  return (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

const toCSVRow = cells => cells.map(csvCell).join(',');

function waitForEnter(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    const rl = readline.createInterface({ input: process.stdin });
    rl.once('line', () => { rl.close(); resolve(); });
  });
}

// ── API-response helpers (handles field-name variations) ─────────────────────

function extractItems(json) {
  // TikTok has used several shapes over the years; try all known ones
  return (
    json?.itemList          ??   // current web API
    json?.data?.itemList    ??   // wrapped variant
    json?.aweme_list        ??   // older/app API
    []
  );
}

function getCreateTime(item) {
  const ct = item.createTime ?? item.create_time ?? 0;
  // guard against millisecond timestamps (> year 2001 in seconds = 1e9)
  return ct > 1e12 ? Math.floor(ct / 1000) : ct;
}

function getStats(item) {
  const s = item.stats ?? item.statistics ?? item.statsV2 ?? {};
  return {
    likes:    toNum(s.diggCount    ?? s.likeCount    ?? s.like_count),
    saves:    toNum(s.collectCount ?? s.favoriteCount ?? s.collect_count),
    comments: toNum(s.commentCount ?? s.comment_count),
  };
}

function isItemPinned(item) {
  return !!(
    item.isPinnedByAuthor ??
    item.isPinned         ??
    item.pin              ??
    item.pinnedStatus     ??
    (item.status?.privateStatus === 1)  // some API variants
  );
}

function isSlideshow(item) {
  // photo carousels / slideshows have an imagePost field
  return !!(item.imagePost ?? item.images ?? item.image_post);
}

// ── network scraping ──────────────────────────────────────────────────────────

async function scrapeNetwork(allItems) {
  fs.mkdirSync(CONFIG.profileDir, { recursive: true });

  const ctx = await chromium.launchPersistentContext(CONFIG.profileDir, {
    headless: false,
    viewport: { width: 1280, height: 860 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
    ],
    userAgent: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'AppleWebKit/537.36 (KHTML, like Gecko)',
      'Chrome/125.0.0.0 Safari/537.36',
    ].join(' '),
  });

  const page    = ctx.pages()[0] ?? await ctx.newPage();
  let hasMore   = true;
  let rawSeq    = 0;

  page.on('response', async response => {
    if (!/\/api\/post\/item_list\//.test(response.url())) return;
    let json;
    try { json = await response.json(); } catch { return; }

    // persist raw response
    const file = path.join(CONFIG.rawDir, `raw_${Date.now()}_${++rawSeq}.json`);
    fs.writeFileSync(file, JSON.stringify(json, null, 2));

    const items = extractItems(json);
    items.forEach(item => { if (!allItems.has(String(item.id))) allItems.set(String(item.id), item); });

    if (json.hasMore === false || json.hasMore === 0) hasMore = false;

    const inRange = countInRange(allItems);
    process.stdout.write(
      `\r  [API] items total=${allItems.size}  videos in date-range=${inRange}    `
    );
  });

  // ── navigate ────────────────────────────────────────────────────────────────
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(2500);

  // ── login check ─────────────────────────────────────────────────────────────
  const loginIndicator = await page.$(
    '[data-e2e="top-login-button"], [data-e2e="login-modal-open-btn"], [class*="LoginBtn"]'
  );
  if (loginIndicator) {
    console.log('\n\n🔐 Log in to TikTok in the browser window, then press Enter here...');
    await waitForEnter('Press Enter to continue > ');
    await sleep(2000);
    // navigate again so the profile feed fires after login
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(2500);
  }

  console.log(`\n🔍 Scraping @${CONFIG.username}…  (Ctrl-C to abort)\n`);

  // ── scroll loop ──────────────────────────────────────────────────────────────
  let stale    = 0;
  let prevSize = 0;

  while (hasMore) {
    // ── captcha / login-wall detection ─────────────────────────────────────
    const blocked = await page.$(
      '[id*="captcha"],[class*="CaptchaVerify"],[class*="captcha"],[data-e2e="login-modal"]'
    );
    if (blocked) {
      console.log('\n\n⚠️  Captcha / login wall detected — solve it in the browser, then press Enter…');
      await waitForEnter('Press Enter to continue > ');
      await sleep(1000);
      continue;
    }

    // ── scroll ──────────────────────────────────────────────────────────────
    await page.evaluate(() => window.scrollBy(0, Math.floor(Math.random() * 500) + 300));
    await randomDelay();

    // ── stale check ─────────────────────────────────────────────────────────
    if (allItems.size === prevSize) {
      if (++stale >= 6) {
        console.log('\n\n⚠️  No new items after 6 consecutive scrolls — stopping.');
        break;
      }
    } else {
      stale    = 0;
      prevSize = allItems.size;
    }

    // ── date-cutoff check (ignore pinned posts) ──────────────────────────────
    const nonPinnedVideos = [...allItems.values()].filter(
      i => !isSlideshow(i) && !isItemPinned(i)
    );
    const oldOnes = nonPinnedVideos.filter(i => getCreateTime(i) < CUTOFF_UNIX);
    if (oldOnes.length > 0) {
      console.log('\n\n📅 Reached posts older than the cutoff date — stopping scroll.');
      break;
    }
  }

  if (!hasMore) console.log('\n\n✅ hasMore=false — all profile posts loaded.');
  await ctx.close();
}

function countInRange(map) {
  return [...map.values()].filter(
    i => !isSlideshow(i) && getCreateTime(i) >= CUTOFF_UNIX
  ).length;
}

// ── filter & export ───────────────────────────────────────────────────────────

function buildOutput(allItems) {
  let totalScanned = 0, inDateRange = 0, passedFilter = 0;
  const rows = [];

  for (const item of allItems.values()) {
    totalScanned++;
    if (isSlideshow(item))                       continue;   // photo/slideshow
    if (getCreateTime(item) < CUTOFF_UNIX)       continue;   // too old
    inDateRange++;

    const { likes, saves, comments } = getStats(item);
    if (saves < CONFIG.minSaves)                 continue;   // under threshold
    passedFilter++;

    rows.push({
      caption:  item.desc ?? '',
      id:       String(item.id),
      likes,
      saves,
      comments,
    });
  }

  rows.sort((a, b) => b.saves - a.saves);

  const BOM     = '﻿';
  const headers = ['caption','link','likes','saves','comments',
                   'likes_exact','saves_exact','comments_exact'];
  const lines   = rows.map(r => toCSVRow([
    r.caption,
    `https://www.tiktok.com/@${CONFIG.username}/video/${r.id}`,
    fmtCount(r.likes),
    fmtCount(r.saves),
    fmtCount(r.comments),
    r.likes,
    r.saves,
    r.comments,
  ]));

  fs.writeFileSync(
    CONFIG.outputFile,
    BOM + [toCSVRow(headers), ...lines].join('\r\n'),
    'utf8',
  );

  return { totalScanned, inDateRange, passedFilter };
}

// ── entry point ───────────────────────────────────────────────────────────────

async function main() {
  const fromRaw = process.argv.includes('--from-raw');
  fs.mkdirSync(CONFIG.rawDir, { recursive: true });

  const allItems = new Map();  // id → item

  if (fromRaw) {
    // ── load from cached raw files ───────────────────────────────────────────
    const files = fs.readdirSync(CONFIG.rawDir).filter(f => f.endsWith('.json')).sort();
    if (files.length === 0) {
      console.error('No raw JSON files found in', CONFIG.rawDir);
      process.exit(1);
    }
    console.log(`📂 Loading ${files.length} raw file(s) from ./raw …`);
    for (const f of files) {
      try {
        const json = JSON.parse(fs.readFileSync(path.join(CONFIG.rawDir, f), 'utf8'));
        extractItems(json).forEach(item => {
          if (!allItems.has(String(item.id))) allItems.set(String(item.id), item);
        });
      } catch {
        console.warn(`  ⚠️  Could not parse ${f} — skipped.`);
      }
    }
    console.log(`  Loaded ${allItems.size} unique items.\n`);
  } else {
    // ── live scrape ──────────────────────────────────────────────────────────
    await scrapeNetwork(allItems);
    console.log('');
  }

  const { totalScanned, inDateRange, passedFilter } = buildOutput(allItems);

  console.log('─────────────────────────────────────────────────');
  console.log(`  Posts scanned              : ${totalScanned}`);
  console.log(`  Videos in date range       : ${inDateRange}`);
  console.log(`  Passed filter (≥${(CONFIG.minSaves / 1000).toFixed(0)}K saves): ${passedFilter}`);
  console.log(`  Output                     : ${CONFIG.outputFile}`);
  console.log('─────────────────────────────────────────────────\n');
}

main().catch(err => { console.error('\n💥', err.message); process.exit(1); });
