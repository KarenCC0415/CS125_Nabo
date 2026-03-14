import { get } from "http";

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

// ── Budget scale ──
// User preference tiers (from modal)
const BUDGET_RANGES = {
  'free': { min: 0,   max: 0        },
  '$':    { min: 1,   max: 19       },
  '$$':   { min: 20,  max: 49       },
  '$$$':  { min: 50,  max: Infinity },
};

// place.price symbol -> numeric midpoint used for range comparison
// "$1–10"  -> mid 5   -> falls in $   (1–19)
// "$10–20" -> mid 15  -> falls in $   (1–19)
// "$30–50" -> mid 40  -> falls in $$  (20–49)
// "$50–100"-> mid 75  -> falls in $$$ (50+)
const SYMBOL_TO_MIDPOINT = {
  '$':   10,   // treat bare "$"  as mid of $1–19
  '$$':  35,   // treat bare "$$" as mid of $20–49
  '$$$': 75,   // treat bare "$$$"as mid of $50–100
};

// Returns a range object if pref is a recognised budget tier, else null.
function parseBudgetRange(pref) {
  return BUDGET_RANGES[pref.trim().toLowerCase()] ?? null;
}

// Parses price strings like "$10–20", "$5-15", or "$25" into a numeric midpoint.
// Handles en-dash (–) and regular hyphen (-).
// Returns null if unparseable.
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

// Haversine formula -- returns distance in miles between two lat/lng points
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

// userCoords: { lat, lng }   (from req.query, passed in from server.js)
// maxDistanceMiles: number | null   (from profile.prefs.distance)
export function computeSimilarityScore(place, userQuery, userPreferences, userCoords = null, maxDistanceMiles = null) {
  let score = 0;

  // ── Distance ──
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

  // ── Budget hard filter ──
  // Step 1: check if place.price is a bare symbol ("$", "$$", "$$$").
  //         If so, convert to a known midpoint and compare against the user's tier.
  // Step 2: if not a symbol, try to parse it as a range string ("$10–20") and use the midpoint.
  // Step 3: if no price data at all, let the place through unpenalised.
  const budgetPref = userPreferences.find(p => parseBudgetRange(p) !== null);
  if (budgetPref) {
    const budgetRange = parseBudgetRange(budgetPref);
    const rawPrice    = (place.price || "").toString().trim();

    let priceMidpoint = null;

    if (SYMBOL_TO_MIDPOINT.hasOwnProperty(rawPrice)) {
      // ── It's a bare symbol: "$", "$$", or "$$$" ──
      priceMidpoint = SYMBOL_TO_MIDPOINT[rawPrice];
    } else {
      // ── Try to parse as a range or single number ──
      priceMidpoint = parsePriceString(rawPrice);
    }

    if (priceMidpoint !== null && !isNaN(priceMidpoint)) {
      if (priceMidpoint < budgetRange.min || priceMidpoint > budgetRange.max) {
        score -= 75; // outside budget — exclude entirely
      }
      score += 20; // confirmed in-range bonus
    }
    // priceMidpoint === null means no usable price data — let through unpenalised
  }

  // ── Text relevance ──
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

  // ── Rating ──
  if (place.rating && place.reviews) {
    score += place.rating * Math.log(place.reviews + 1);
  }

  // ── Free preference (payments extension) ──
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