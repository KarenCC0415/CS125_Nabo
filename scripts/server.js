// server.js — run with: node server.js
// This keeps your API keys on the server, never exposed to the browser.

import express from 'express';
import axios from 'axios';
import { HASDATA_MAPS_API_KEY } from './private_api_keys.js';
import { computeSimilarityScore } from './ranking.js';

const app = express();

NaboProfile.init();

const profile = NaboProfile.get();
const userPreferences = profile.prefs.interests.map(i => i.toLowerCase());

app.use(express.static('.')); // serves your HTML/CSS/JS files

app.get('/api/search', async (req, res) => {
  const { q, lat, lng } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  // Default to LA if no coords provided
  const ll = (lat && lng)
    ? `@${lat},${lng},14z`
    : '@34.0522,-118.2437,14z';

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

    // Rank results
    const ranked = allResults
      .map(place => ({
        ...place,
        score: computeSimilarityScore(place, q, userPreferences)
      }))
      .sort((a, b) => b.score - a.score);

    res.json({ results: ranked });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

app.listen(3000, () => console.log('NABO server running at http://localhost:3000'));