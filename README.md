# Oscar Picks

A single-page app for friends to submit Oscar predictions and track results live during the ceremony.

## Architecture

- **Frontend**: Vanilla JS/HTML/CSS served via GitHub Pages
- **Backend**: Cloudflare Worker (`worker/worker.js`) with R2 object storage
- **Data**: `votes.json` and `winners.json` stored in an R2 bucket (`oscar-picks`)

## Files

| File | Purpose |
|------|---------|
| `index.html` | Single page with Picks and Results tabs |
| `app.js` | All frontend logic: picks submission, charts, scorecard, head-to-head |
| `styles.css` | Dark theme styling |
| `nominees.js` | Category and nominee data (update yearly) |
| `worker/worker.js` | API endpoints + Wikipedia scraper for auto-populating winners |
| `worker/wrangler.toml` | Cloudflare Worker config with cron trigger |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/votes` | - | All submitted picks |
| POST | `/vote` | - | Submit/update picks (locked after `LOCKOUT_TIME`) |
| GET | `/winners` | - | Announced winners |
| POST | `/winner` | `X-Admin` header | Manually set a category winner |
| POST | `/scrape` | `X-Admin` header | Manually trigger Wikipedia scrape |

## Wikipedia Scraper

A cron job (`*/3 * * * *`) fetches the ceremony's Wikipedia page and parses bolded entries as winners. It fuzzy-matches them against our nominee data and writes to `winners.json`. It won't overwrite existing winners, so manual `/winner` calls take precedence.

## Updating for Next Year

1. **`nominees.js`**: Replace all categories and nominees for the new ceremony
2. **`worker/worker.js`**:
   - Update `LOCKOUT_TIME` to the new ceremony date/time
   - Update `NOMINEE_DATA` to match the new `nominees.js`
   - Update `WIKI_TO_KEY` if Wikipedia changes category heading names
   - Update the Wikipedia API URL to the new ceremony page (e.g., `99th_Academy_Awards`)
3. **`app.js`**:
   - Update `LOCKOUT_TIME` to match
   - Update `CEREMONY_ORDER` with the new presentation order (available on Wikipedia after the ceremony, or just use NOMINEES key order during)
4. **`index.html`**: Update the title and subtitle year
5. **R2 bucket**: Clear out `votes.json` and `winners.json` (or start with a fresh bucket)

## Development

```sh
# Deploy the worker
cd worker
npx wrangler deploy

# Tail worker logs
npx wrangler tail

# The frontend is static — just open index.html or push to GitHub Pages
```

## Secrets

The worker uses one secret:

```sh
npx wrangler secret put ADMIN_SECRET
```

This is used for the `X-Admin` header on `/winner` and `/scrape` endpoints.
