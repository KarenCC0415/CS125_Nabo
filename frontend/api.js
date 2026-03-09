// api.js — frontend API client
// Calls your local Express proxy at /api/search (see server.js)
// The proxy keeps your API keys server-side and safe.

export async function fetchResults(query, coords = null, prefs = []) {
  const params = new URLSearchParams({ q: query });
  if (coords) {
    params.set('lat', coords.lat);
    params.set('lng', coords.lng);
  }
  if (prefs.length) {
    params.set('prefs', prefs.join(','));
  }

  const res = await fetch(`/api/search?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}