// server.js — run with: node server.js
// This keeps your API keys on the server, never exposed to the browser.

import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { HASDATA_MAPS_API_KEY } from './private_api_keys.js';
import { computeSimilarityScore } from './ranking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/scripts', express.static(path.join(__dirname)));

app.get('/api/search', async (req, res) => {
  const { q, lat, lng, prefs } = req.query;
  if (!q) {
    q = "Things to do";
  }

  let ll;
  if (lat && lng) {
    ll = `@${lat},${lng},14z`;
  } else {
    console.warn('⚠️  No lat/lng received — falling back to Irvine default');
    ll = '@33.6846,-117.8265,14z';
  }

  console.log("CURRENTLY IN SERVER.JS: GOING TO OUTPUT PREFS\n");
  console.log(prefs);

  // Split all prefs, then separate interests from distance
  const allPrefs = prefs ? prefs.split(',').map(p => p.trim().toLowerCase()) : [];

  const userPreferences = allPrefs.filter(p => !p.includes('mile') && p !== null);

  const maxDistanceMiles = (() => {
    const distPref = allPrefs.find(p => p.includes('mile'));
    if (!distPref) return null;
    const num = parseFloat(distPref);
    return isNaN(num) ? null : num;
  })();

  const userCoords = (lat && lng) ? { lat, lng } : null;

  console.log(`[NABO] q="${q}" prefs=[${userPreferences}] distance=${maxDistanceMiles} coords=${ll}`);

  try {
    const allResults = [];
    let nextPageToken = null;

    for (let page = 0; page < 3; page++) {
      const params = { q, ll };
      if (nextPageToken) params.nextPageToken = nextPageToken;

      const { data } = await axios.get(
        'https://api.hasdata.com/scrape/google-maps/search',
        {
          params,
          headers: {
            'x-api-key': HASDATA_MAPS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      if (data.localResults) allResults.push(...data.localResults);
      nextPageToken = data.nextPageToken || null;
      if (!nextPageToken) break;
    }

    console.log(`[NABO] ${allResults.length} results fetched, ranking...`);

    // ── Score all places ──
    const scored = allResults
      .map(place => ({
        ...place,
        score: computeSimilarityScore(place, q, userPreferences, userCoords, maxDistanceMiles)
      }))
      .filter(p => p.score !== -Infinity);

    // ── Normalize scores to 1–100 ──
    const rawScores = scored.map(p => p.score);
    const minScore  = Math.min(...rawScores);
    const maxScore  = Math.max(...rawScores);
    const range     = maxScore - minScore;

    const ranked = scored
      .map(p => ({
        ...p,
        score: range > 0
          ? Math.round(1 + ((p.score - minScore) / range) * 99)
          : 100
      }))
      .sort((a, b) => b.score - a.score);

    res.json({ results: ranked });
  } catch (err) {
    console.error('[NABO] server error:', err.message);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

app.listen(3000, () => console.log('NABO server running at http://localhost:3000'));