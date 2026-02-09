import { TICKETMASTER_API_KEY, HASDATA_MAPS_API_KEY, YELP_API_KEY } from './private_api_keys.js'
import axios from "axios";

const options = {
  method: 'GET',
  url: 'https://api.hasdata.com/scrape/google-maps/search',
  params: {q: 'Things to do', ll: '@33.638695, -117.860383,14z'},
  headers: {
    'x-api-key': HASDATA_MAPS_API_KEY,
    'Content-Type': 'application/json'
  }
};

try {
  const { data } = await axios.request(options);
	console.log(data);
} catch (error) {
	console.error(error);
}
