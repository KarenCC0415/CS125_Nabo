NaboProfile.init();

const profile = NaboProfile.get();
const userPreferences = profile?.prefs.interests.map(i => i.toLowerCase()) ?? [];

async function _awaitLocation(timeout = 8000) {
  const interval = 100;
  let waited = 0;
  while (waited < timeout) {
    const loc = NaboProfile.get()?.location;
    if (loc?.lat && loc?.lng) return loc;
    await new Promise(r => setTimeout(r, interval));
    waited += interval;
  }
  return NaboProfile.get()?.location ?? null;
}

async function goSearch(query) {
  if (!query.trim()) return;

  NaboProfile.trackSearch(query.trim());

  const loc = await _awaitLocation();
  const lat = loc?.lat;
  const lng = loc?.lng;

  const params = new URLSearchParams({ q: query.trim() });
  if (lat && lng) {
    params.set('lat', lat);
    params.set('lng', lng);
  }
  if (userPreferences.length) {
    params.set('prefs', userPreferences.join(','));
  }

  window.location.href = `results.html?${params}`;
}

document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const query = pill.textContent.trim().replace(/^\S+\s*/, '');
    goSearch(query);
  });
});

window.goSearch = goSearch;