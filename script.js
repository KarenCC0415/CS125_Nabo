const button = document.getElementById("getLocationBtn");
const status = document.getElementById("status");

const cityEl = document.getElementById("city");
const stateEl = document.getElementById("state");
const zipEl = document.getElementById("zip");
const longEl = document.getElementById("long");
const latEl = document.getElementById("lat");

button.addEventListener("click", () => {
  status.textContent = "Getting location...";

  if (!navigator.geolocation) {
    status.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    success,
    error,
    { enableHighAccuracy: true }
  );
});

function success(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;

  longEl.textContent = longitude.toFixed(6);
  latEl.textContent = latitude.toFixed(6);

  reverseGeocode(latitude, longitude);
}

function error() {
  status.textContent = "Unable to retrieve your location.";
}

async function reverseGeocode(lat, lon) {
  try {
    status.textContent = "Resolving address...";

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );

    const data = await response.json();
    const address = data.address || {};

    cityEl.textContent =
      address.city ||
      address.town ||
      address.village ||
      "Not available";

    stateEl.textContent = address.state || "Not available";
    zipEl.textContent = address.postcode || "Not available";
    

    status.textContent = "Location retrieved successfully.";
  } catch (err) {
    status.textContent = "Failed to resolve address.";
  }
}
