// ranking is based on query + user preference

export function computeSimilarityScore(place, userQuery, userPreferences) {
  let score = 0;

  const text = (
    (place.title || "") + " " +
    (place.address?.toLowerCase() || "") + " " +
    (place.type || "") + " " +
    (place.website || "") + " " + 
    (place.description || "")
  ).toLowerCase();

  const queryWords = userQuery.toLowerCase().split(" ");

  // 1️⃣ Keyword match score
  queryWords.forEach(word => {
    if (text.includes(word)) {
      score += 5;
    }
  });

  // 2️⃣ Preference bonus
  userPreferences.forEach(pref => {
    if (text.includes(pref.toLowerCase())) {
      score += 3;
    }
  });

  // 3️⃣ Rating bonus
  if (place.rating) {
    score += place.rating * 2;
  }

  return score;
}