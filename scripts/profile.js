// ── NABO USER PROFILE ──
// Persistent profile object that starts from modal prefs
// and grows as the user interacts with the app.
// Location is set externally via NaboProfile.saveLocation() in main.html.

const PROFILE_KEY = 'naboProfile';

const defaultProfile = {
  createdAt: null,
  updatedAt: null,
  prefs: {
    interests: [],
    distance: null,
    budget: null,
    time: null,
  },
  location: {
    lat: null,
    lng: null,
    city: null,
    state: null,
    zip: null,
    country: null,
    source: null,
    acquiredAt: null,
  },
  history: {
    searches: [],
    viewed: [],
    clicked: [],
  },
  derived: {
    topCategories: [],
    totalSearches: 0,
  }
};

// ── Read / Write ──

function getProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveProfile(profile) {
  profile.updatedAt = new Date().toISOString();
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ── Init ──

function _buildDefaultProfile() {
  let modalPrefs = {};
  try {
    const raw = localStorage.getItem('naboPrefs');
    if (raw) modalPrefs = JSON.parse(raw);
  } catch {}

  return {
    ...defaultProfile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    prefs: {
      interests: modalPrefs.interests || [],
      distance:  modalPrefs.distance  || null,
      budget:    modalPrefs.budget    || null,
      time:      modalPrefs.time      || null,
    },
  };
}

function initProfile() {
  const existing = getProfile();
  if (existing) return existing;

  const profile = _buildDefaultProfile();
  saveProfile(profile);
  return profile;
}

// ── Update prefs ──

function updatePrefs(newPrefs) {
  const profile = getProfile() || _buildDefaultProfile();
  profile.prefs = { ...profile.prefs, ...newPrefs };
  localStorage.setItem('naboPrefs', JSON.stringify(profile.prefs));
  saveProfile(profile);
  return profile;
}

// ── Track a search query ──

function trackSearch(query) {
  const profile = getProfile() || _buildDefaultProfile();
  profile.history.searches.unshift({ query, timestamp: new Date().toISOString() });
  profile.history.searches = profile.history.searches.slice(0, 50);
  profile.derived.totalSearches = profile.history.searches.length;
  saveProfile(profile);
}

// ── Track a result being viewed ──

function trackViewed(place) {
  const profile = getProfile() || _buildDefaultProfile();
  profile.history.viewed.unshift({ ...place, timestamp: new Date().toISOString() });
  profile.history.viewed = profile.history.viewed.slice(0, 100);
  _recomputeTopCategories(profile);
  saveProfile(profile);
}

// ── Track a result being clicked ──

function trackClicked(place) {
  const profile = getProfile() || _buildDefaultProfile();
  profile.history.clicked.unshift({ ...place, timestamp: new Date().toISOString() });
  profile.history.clicked = profile.history.clicked.slice(0, 100);
  _recomputeTopCategories(profile);
  saveProfile(profile);
}

// ── Derive top categories ──

function _recomputeTopCategories(profile) {
  const counts = {};
  const allActivity = [...profile.history.clicked, ...profile.history.viewed];
  for (const item of allActivity) {
    if (item.category) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
  }
  profile.derived.topCategories = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));
}

// ── Clear profile ──

function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem('naboPrefs');
}

// ── Export ──

window.NaboProfile = {
  init:         initProfile,
  get:          getProfile,
  updatePrefs,
  trackSearch,
  trackViewed,
  trackClicked,
  clear:        clearProfile,
  saveLocation: function(locObj) {
    console.log('saveLocation called:', locObj);
    const profile = getProfile() || _buildDefaultProfile();
    profile.location = { ...(profile.location || {}), ...locObj };
    saveProfile(profile);
  }
};