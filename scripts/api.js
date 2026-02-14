import { TICKETMASTER_API_KEY, HASDATA_MAPS_API_KEY, YELP_API_KEY } from './private_api_keys.js'
import axios from "axios"
import { computeSimilarityScore } from './ranking.js'

const userQuery = "Free things to do";
const userPreferences = ["outdoor", "free", "fun"];

const options = {
  method: 'GET',
  url: 'https://api.hasdata.com/scrape/google-maps/search',
  params: {q: userQuery, ll: '@33.638695, -117.860383,14z'},
  headers: {
    'x-api-key': HASDATA_MAPS_API_KEY,
    'Content-Type': 'application/json'
  }
};


try {
  const { data } = await axios.request(options);

  const rankedResults = data.localResults
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
