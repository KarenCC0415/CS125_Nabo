import { TICKETMASTER_API_KEY, HASDATA_MAPS_API_KEY, YELP_API_KEY } from './private_api_keys.js'
import axios from "axios"
import { computeSimilarityScore } from './ranking.js'

const userQuery = "asian food";
const userPreferences = ["chinese", "korean"];

async function fetchAllResults(userQuery) {
  const allResults = [];
  let nextPageToken = null;
  const maxPages = 3;

  for (let page = 0; page < maxPages; page++) {
    const params = { q: userQuery, ll: '@34.0522,-118.2437,14z' };
    if (nextPageToken) params.nextPageToken = nextPageToken;

    const { data } = await axios.request({
      method: 'GET',
      url: 'https://api.hasdata.com/scrape/google-maps/search',
      params,
      headers: {
        'x-api-key': HASDATA_MAPS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (data.localResults) allResults.push(...data.localResults);

    nextPageToken = data.nextPageToken || null;
    if (!nextPageToken) break;
  }

  return allResults;
}

try {
  const allPlaces = await fetchAllResults(userQuery);

  const rankedResults = allPlaces
    .map(place => ({
      place,
      score: computeSimilarityScore(place, userQuery, userPreferences)
    }))
    .sort((a, b) => b.score - a.score);

  console.log("Top Ranked Results:");
  console.log(rankedResults.slice(0, 5));

} catch (error) {
  console.error(error);
}