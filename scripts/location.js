
/*
// ── Location Display ──
// Reads location from NaboProfile (already acquired on init).
// Falls back to a fresh GPS lookup only if the profile has no location yet.

const locDisplay = document.getElementById('locDisplay');

async function showLocation() {
  // 1. Try to get location from the profile first
  let loc = NaboProfile.get()?.location;

  // 2. If profile isn't ready yet (e.g. this script runs before init resolves),
  //    wait briefly then re-check before falling back to a fresh lookup.
  if (!loc?.lat) {
    await new Promise(r => setTimeout(r, 500));
    loc = NaboProfile.get()?.location;
  }

  // 3. Last resort — trigger a fresh acquire and persist it to the profile
  if (!loc?.lat) {
    const profile = await NaboProfile.refreshLocation();
    loc = profile?.location;
  }

  if (loc?.lat) {
    // Reverse-geocode for a human-readable label
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`
      );
      const data = await res.json();
      const a = data.address || {};
      const city  = a.city || a.town || a.village || a.suburb || 'Unknown';
      const state = a.state || '';
      const zip   = a.postcode || '';

      // Patch the Nominatim-derived city back into the stored profile
      const profile = NaboProfile.get();
      if (profile) {
        profile.location.city = city;
        profile.location.acquiredAt = profile.location.acquiredAt || new Date().toISOString();
        localStorage.setItem('naboProfile', JSON.stringify(profile));
      }

      locDisplay.innerHTML = `
        <div class="ping-wrap">
          <div class="ping-ring"></div>
          <div class="ping-dot"></div>
        </div>
        <div class="loc-text">
          <span>${city}${state ? ', ' + state : ''}</span>${zip ? ' · ' + zip : ''}
        </div>
      `;
    } catch {
      locDisplay.innerHTML = `<div class="loc-text">Location unavailable</div>`;
    }
  } else {
    locDisplay.innerHTML = `<div class="loc-text">Location unavailable</div>`;
  }

  locDisplay.classList.add('visible');
}

showLocation();
*/