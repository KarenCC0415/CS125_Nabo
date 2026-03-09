// main.js

// ── Init profile (reads from localStorage via profile.js) ──
NaboProfile.init();
const profile = NaboProfile.get();
const userPreferences = profile.prefs.interests.map(i => i.toLowerCase());

// ── Navigate to results page with query, prefs, and coords ──
function goSearch(query) {
  if (!query.trim()) return;

  NaboProfile.trackSearch(query.trim());

  // Grab coords stored on the page by the geolocation script in main.html
  const latEl = document.getElementById('lat');
  const lngEl = document.getElementById('long');
  const lat = latEl?.textContent?.trim();
  const lng = lngEl?.textContent?.trim();

  const params = new URLSearchParams({ q: query.trim() });
  if (lat && lng && lat !== '—' && lng !== '-') {
    params.set('lat', lat);
    params.set('lng', lng);
  }
  if (userPreferences.length) {
    params.set('prefs', userPreferences.join(','));
  }

  window.location.href = `results.html?${params}`;
}

// ── Pill clicks ──
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    // Strip leading emoji (first non-space word) to get the label
    const query = pill.textContent.trim().replace(/^\S+\s*/, '');
    goSearch(query);
  });
});