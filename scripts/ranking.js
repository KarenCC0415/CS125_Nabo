import { get } from "http";
import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve("nabo.log");

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line, "utf8");
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "its", "be", "as", "was",
  "are", "were", "been", "has", "have", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "shall", "can",
  "not", "no", "nor", "so", "yet", "both", "either", "neither",
  "this", "that", "these", "those", "i", "me", "my", "we", "our",
  "you", "your", "he", "she", "they", "them", "his", "her", "their",
  "what", "which", "who", "whom", "when", "where", "why", "how",
  "all", "any", "each", "few", "more", "most", "other", "some", "such",
  "up", "out", "about", "into", "through", "near", "just", "around",
  "find", "get", "want", "looking", "look", "show", "things", "stuff"
]);

function filterStopWords(words) {
  return words.filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

const BUDGET_RANGES = {
  'free': { min: 0,   max: 0        },
  '$':    { min: 1,   max: 19       },
  '$$':   { min: 20,  max: 49       },
  '$$$':  { min: 50,  max: Infinity },
};


const SYMBOL_TO_MIDPOINT = {
  '$':   10,
  '$$':  35,
  '$$$': 75,
};

function parseBudgetRange(pref) {
  return BUDGET_RANGES[pref.trim().toLowerCase()] ?? null;
}
function parsePriceString(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[$\u20ac\u00a3\u00a5\s]/g, '');
  const rangeMatch = cleaned.match(/^(\d+(?:\.\d+)?)[\u2013\-~](\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  }
  const singleMatch = cleaned.match(/^(\d+(?:\.\d+)?)$/);
  if (singleMatch) return parseFloat(singleMatch[1]);
  return null;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeSimilarityScore(place, userQuery, userPreferences, userCoords = null, maxDistanceMiles = null) {
  let score = 0;

  const placeLat = place.gpsCoordinates?.latitude  ?? place.gpsCoordinates?.lat ?? null;
  const placeLng = place.gpsCoordinates?.longitude ?? place.gpsCoordinates?.lng ?? null;

  if (userCoords?.lat && userCoords?.lng && placeLat && placeLng) {
    const distanceMiles = haversineDistance(
      parseFloat(userCoords.lat), parseFloat(userCoords.lng),
      parseFloat(placeLat),       parseFloat(placeLng)
    );

    if (maxDistanceMiles && distanceMiles > maxDistanceMiles) {
      score -= 50;
    }

    const ceiling = maxDistanceMiles || 25;
    score += Math.max(0, 10 * (1 - distanceMiles / ceiling));
  }

  const budgetPref = userPreferences.find(p => parseBudgetRange(p) !== null);
  log("do we have a budgetpref?: " + budgetPref);
  if (budgetPref) {
    log("WE HAVE A BUDGET PREF");
    const budgetRange = parseBudgetRange(budgetPref);
    const rawPrice    = (place.price || "").toString().trim();

    let priceMidpoint = null;

    if (SYMBOL_TO_MIDPOINT.hasOwnProperty(rawPrice)) {
      priceMidpoint = SYMBOL_TO_MIDPOINT[rawPrice];
    } else {
      priceMidpoint = parsePriceString(rawPrice);
    }

    log("PRICE_MIDPOINT:" + priceMidpoint);
    
    if (priceMidpoint !== null && !isNaN(priceMidpoint)) {
      log("PRICE MIDPOINT EXISTS");
      if (priceMidpoint < budgetRange.min || priceMidpoint > budgetRange.max) {
        log("PRICE MIDPOINT OUTSIDE BUDGET RANGE");
        score -= 75; 
      }

      log("PRICE MIDPOINT PERFECT FOR BUDGET RANGE");
      score += 100; 
    }
  
  }


  const text = (
    (place.title || "") + " " +
    (place.address?.toLowerCase() || "") + " " +
    (place.type || "") + " " +
    (place.website || "") + " " +
    (place.description || "")
  ).toLowerCase();

  const typesText    = (place.types || []).join(" ").toLowerCase();
  const servicesText = (place.serviceOptions || []).join(" ").toLowerCase();
  const fullText     = text + " " + typesText + " " + servicesText;
  const extensionsText = flattenExtensions(place.extensions).toLowerCase();

  const queryWords = filterStopWords(userQuery.toLowerCase().split(/\s+/));
  queryWords.forEach(word => {
    if (fullText.includes(word)) score += 1;
  });

  userPreferences.forEach(pref => {
    const prefWords = filterStopWords(pref.toLowerCase().split(/\s+/));
    const prefClean = prefWords.join(" ");
    if (fullText.includes(prefClean))       score += 5;
    if (extensionsText.includes(prefClean)) score += 5;
  });


  if (place.rating && place.reviews) {
    score += place.rating * Math.log(place.reviews + 1);
  }


  const payments = (place.extensions?.payments || []).map(p => p.toLowerCase());
  userPreferences.forEach(pref => {
    if (filterStopWords(pref.toLowerCase().split(/\s+/)).includes("free")) {
      if (payments.some(p => p.includes("free"))) score += 20;
    }
  });

  return score;
}

function flattenExtensions(exts) {
  if (!exts) return "";
  let result = "";
  for (const key in exts) {
    const value = exts[key];
    if (Array.isArray(value)) {
      result += " " + value.join(" ");
    } else if (typeof value === "object" && value !== null) {
      result += " " + flattenExtensions(value);
    } else {
      result += " " + value;
    }
  }
  return result;
}