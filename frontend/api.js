async function _awaitLocation(timeout = 5000) {
  const interval = 100;
  let waited = 0;
  while (waited < timeout) {
    const loc = window.NaboProfile?.get()?.location;
    if (loc?.lat && loc?.lng) return loc;
    await new Promise(r => setTimeout(r, interval));
    waited += interval;
  }
  return window.NaboProfile?.get()?.location ?? null;
}

export async function fetchResults(query, coords = null, prefs = null) {
 
  const loc = coords ?? await _awaitLocation();

  const profile = window.NaboProfile?.get();
  const userPrefs =
  (prefs?.length ? prefs : null) ??
  [
    ...(profile?.prefs?.interests?.map(i => i.toLowerCase()) ?? []),
    profile?.prefs?.distance,
    profile?.prefs?.budget,
    profile?.prefs?.time
  ].filter(Boolean);

  console.log("CURRENTLY IN API.JS, PRINTING OUT USERPREFS");
  console.log(userPrefs);

  const params = new URLSearchParams({ q: query });
  if (loc?.lat && loc?.lng) {
    params.set('lat', loc.lat);
    params.set('lng', loc.lng);
  }
  if (userPrefs.length) {
    params.set('prefs', userPrefs.join(','));
  }

  const res = await fetch(`/api/search?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}