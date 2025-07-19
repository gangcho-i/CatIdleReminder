let watchId;
let lastPosition = null;
let idleStartTime = null;
let engineOffTimer = null;
let engineOffStartTime = null;
let idleEvents = 0;

const CO2_PER_SECOND = 0.0046;

const statusText = document.getElementById("status");
const idleCountEl = document.getElementById("idle-count");
const engineOffTimeEl = document.getElementById("engine-off-time");
const co2SavedEl = document.getElementById("co2-saved");
const startBtn = document.getElementById("start-btn");
const endBtn = document.getElementById("end-btn");

let hasNotified = false;

// Permissions
async function requestPermissions() {
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }

  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return false;
  }

  return true;
}

// Distance calculation
function getDistance(pos1, pos2) {
  const R = 6371e3;
  const toRad = d => (d * Math.PI) / 180;
  const φ1 = toRad(pos1.latitude);
  const φ2 = toRad(pos2.latitude);
  const Δφ = toRad(pos2.latitude - pos1.latitude);
  const Δλ = toRad(pos2.longitude - pos1.longitude);

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Show notification
function showNotification() {
  if (Notification.permission !== "granted") return;

  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification("You’ve been idling. Please turn off your engine.", {
      body: "Select an option below.",
      icon: "cat-scooter.png",
      requireInteraction: true,
      actions: [
        { action: "engineOff", title: "Sure! I will turn off the engine." },
        { action: "tripEnded", title: "Oh, my trip has just ended." }
      ],
      tag: "idle-alert"
    });
  });

  hasNotified = true;
}

// Handle SW messages
navigator.serviceWorker.addEventListener("message", event => {
  const action = event.data;

  if (action === "engineOff") {
    idleEvents++;
    idleCountEl.textContent = idleEvents;
    engineOffStartTime = Date.now();

    engineOffTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - engineOffStartTime) / 1000);
      engineOffTimeEl.textContent = seconds;
      co2SavedEl.textContent = (seconds * CO2_PER_SECOND).toFixed(2);
    }, 1000);
  }

  if (action === "tripEnded") {
    stopTracking();
  }
});

// Start tracking
function startTracking() {
  hasNotified = false;
  lastPosition = null;
  idleStartTime = null;

  statusText.textContent = "Tracking: Trip started";
  startBtn.style.display = "none";
  endBtn.style.display = "inline";

  watchId = navigator.geolocation.watchPosition(pos => {
    const current = pos.coords;

    if (!lastPosition) {
      lastPosition = current;
      return;
    }

    const distance = getDistance(lastPosition, current);
    if (distance < 5) {
      if (!idleStartTime) {
        idleStartTime = Date.now();
      } else if (!hasNotified && (Date.now() - idleStartTime) >= 10000) {
        showNotification();
      }
    } else {
      lastPosition = current;
      idleStartTime = null;
      hasNotified = false;

      if (engineOffTimer) {
        clearInterval(engineOffTimer);
        engineOffTimer = null;
        engineOffTimeEl.textContent = "0";
        co2SavedEl.textContent = "0.00";
      }
    }
  }, err => {
    console.error("Position error", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 5000
  });
}

// Stop tracking
function stopTracking() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  if (engineOffTimer) {
    clearInterval(engineOffTimer);
    engineOffTimer = null;
  }

  startBtn.style.display = "inline";
  endBtn.style.display = "none";
  statusText.textContent = "Tracking: Trip ended";
  lastPosition = null;
  idleStartTime = null;
  hasNotified = false;
}

// Button handlers
startBtn.addEventListener("click", async () => {
  const granted = await requestPermissions();
  if (granted) startTracking();
});

endBtn.addEventListener("click", () => stopTracking());
