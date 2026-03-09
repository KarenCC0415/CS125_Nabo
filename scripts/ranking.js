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

export function computeSimilarityScore(place, userQuery, userPreferences) {
  let score = 0;

  const text = (
    (place.title || "") + " " +
    (place.address?.toLowerCase() || "") + " " +
    (place.type || "") + " " +
    (place.website || "") + " " +
    (place.description || "")
  ).toLowerCase();

  const typesText = (place.types || []).join(" ").toLowerCase();
  const servicesText = (place.serviceOptions || []).join(" ").toLowerCase();
  const fullText = text + " " + typesText + " " + servicesText;

  const extensionsText = flattenExtensions(place.extensions).toLowerCase();

  // Filter stop words from query before scoring
  const queryWords = filterStopWords(userQuery.toLowerCase().split(/\s+/));

  queryWords.forEach(word => {
    if (fullText.includes(word)) {
      score += 1;
    }
  });

  // Filter stop words from preferences too
  userPreferences.forEach(pref => {
    const prefWords = filterStopWords(pref.toLowerCase().split(/\s+/));
    const prefClean = prefWords.join(" ");

    if (fullText.includes(prefClean)) score += 5;
    if (extensionsText.includes(prefClean)) score += 5;
  });

  if (place.rating && place.reviews) {
    const ratingScore = place.rating * Math.log(place.reviews + 1);
    score += ratingScore;
  }

  const payments = (place.extensions?.payments || []).map(p => p.toLowerCase());

  userPreferences.forEach(pref => {
    if (filterStopWords(pref.toLowerCase().split(/\s+/)).includes("free")) {
      if (payments.length === 0) {
        score = 0;
      }
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