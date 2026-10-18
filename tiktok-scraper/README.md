# TikTok Scraper — @khairulaming

Scrapes all **video** posts from a TikTok profile, keeps only videos published
on or after **1 Jan 2025 (UTC+8)** with **≥ 100,000 saves**, and exports them
to a UTF-8-with-BOM CSV file that opens correctly in Excel.

---

## Requirements

- Node.js 18+
- A TikTok account (for login)

---

## Setup

```bash
cd tiktok-scraper
npm install
npx playwright install chromium   # ~170 MB one-time download
```

---

## Usage

### 1. Live scrape

```bash
node scraper.js
# or
npm run scrape
```

A Chromium browser window opens.

- **Not logged in?** The script will print a message and wait. Log in to TikTok
  inside the browser window, then press **Enter** in the terminal. Your session
  is saved in `./browser-profile/` so you only need to log in once.
- **Captcha?** Solve it in the browser window, then press **Enter**.
- The scraper intercepts `/api/post/item_list/` responses, scrolls slowly
  (random 1.5–3 s delays), and stops automatically when it reaches posts older
  than the cutoff date or when TikTok reports no more posts.
- Raw API responses are saved to `./raw/` as you go.

### 2. Re-filter from cached data

Once you have raw files you can re-run with different thresholds without
re-scraping:

```bash
node scraper.js --from-raw
# or
npm run from-raw
```

---

## Output

| File | Description |
|------|-------------|
| `khairulaming_100k_saves.csv` | Filtered results, sorted by saves ↓ |
| `raw/` | Raw API JSON blobs (gitignored) |
| `browser-profile/` | Persistent Chromium session (gitignored) |

### CSV columns

| Column | Description |
|--------|-------------|
| `caption` | Full caption (hashtags, emojis, line breaks preserved) |
| `link` | Direct video URL |
| `likes` | Formatted (e.g. `134.5K`, `2.1M`) |
| `saves` | Formatted |
| `comments` | Formatted |
| `likes_exact` | Raw integer |
| `saves_exact` | Raw integer |
| `comments_exact` | Raw integer |

---

## Config

Edit the `CONFIG` block at the top of `scraper.js`:

```js
const CONFIG = {
  username:       'khairulaming',   // TikTok @handle (no @)
  cutoffISO:      '2025-01-01T00:00:00+08:00',
  minSaves:       100_000,
  ...
};
```

---

## Notes

- The scraper listens for TikTok's internal `POST /api/post/item_list/`
  endpoint. If TikTok changes its API shape, check the `extractItems` and
  `getStats` functions in `scraper.js` — they handle several known field-name
  variants. The raw JSON files in `./raw/` let you inspect exactly what the API
  returned.
- Pinned posts are ignored when deciding whether to stop scrolling, because
  they can appear at the top regardless of date.
- Photo/slideshow posts (`imagePost` field) are silently skipped.
