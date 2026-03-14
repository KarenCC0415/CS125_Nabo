// server.js — run with: node server.js
// This keeps your API keys on the server, never exposed to the browser.

import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { HASDATA_MAPS_API_KEY } from './private_api_keys.js';
import { computeSimilarityScore } from './ranking.js';

// __dirname is not available in ES modules — reconstruct it
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/scripts', express.static(path.join(__dirname)));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/search', async (req, res) => {
  const { q, lat, lng, prefs } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  let ll;
  if (lat && lng) {
    ll = `@${lat},${lng},14z`;
  } else {
    console.warn('⚠️  No lat/lng received — falling back to Irvine default');
    ll = '@33.6846,-117.8265,14z';
  }

  // Parse prefs sent from client e.g. "concerts,food,outdoors"
  const userPreferences = prefs
    ? prefs.split(',').map(p => p.trim().toLowerCase())
    : [];

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

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

app.listen(3000, () => console.log('NABO server running at http://localhost:3000'));