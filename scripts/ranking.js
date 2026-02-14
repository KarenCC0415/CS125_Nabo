export function computeSimilarityScore(place, userQuery, userPreferences) {
  let score = 0;
  let isFree = false;

  const text = (
    (place.title || "") + " " +
    (place.address?.toLowerCase() || "") + " " +
    (place.type || "") + " " +
    (place.website || "") + " " +
    (place.description || "")
  ).toLowerCase();

  const typesText = (place.types || []).join(" ").toLowerCase();
  const servicesText = (place.serviceOptions || []).join(" ").toLowerCase();

  const exts = place.extensions || {}; // default to empty object

  /*
  console.log(place.title + "\n");
  Object.entries(exts).forEach(([key, value]) => {
    console.log(key, value);
  });
  console.log("\n");
  */

  const fullText = text + " " + typesText + " " + servicesText;
  
  const extensionsText = flattenExtensions(place.extensions).toLowerCase();

  const queryWords = userQuery.toLowerCase().split(" ");

  queryWords.forEach(word => {
    if (fullText.includes(word)) {
      score += 1;
    }
  });

  userPreferences.forEach(pref => {
    if (fullText.includes(pref.toLowerCase())) {
      score += 5;
    }
    if (extensionsText.includes(pref.toLowerCase())){
      score += 5;
    }
  });

  if (place.rating && place.reviews) {
    const ratingScore = place.rating * Math.log(place.reviews + 1);
    score += ratingScore;
  }

  
  const payments = (place.extensions?.payments || []).map(p => p.toLowerCase());
  //console.log(place.title);
  //console.log(payments);

  userPreferences.forEach(pref => {
    if (pref.toLowerCase() === "free") {
      if (payments.length === 0) {
        //console.log(place.title + " TRIGGERED IS FREE");
        isFree = true;
      }
    }
  });
  
  return isFree ? score : 0;
}

function flattenExtensions(exts) {
  if (!exts) return "";
  let result = "";
  for (const key in exts) {
    const value = exts[key];
    if (Array.isArray(value)) {
      result += " " + value.join(" "); // join array into string
    } else if (typeof value === "object" && value !== null) {
      result += " " + flattenExtensions(value); // recursive flatten if nested object
    } else {
      result += " " + value;
    }
  }
  return result;
}