let prayerTimes = {};
let notifyMessage;
let arLanguage;
let latitude;
let longitude;
let method;

// get data from storage
function getData() {
  chrome.storage.local.get(
    [
      "prayerTimes",
      "notifyMessage",
      "arLanguage",
      "notifiedTimes",
      "latitude",
      "longitude",
    ],
    (data) => {
      if (data.prayerTimes) {
        prayerTimes = data.prayerTimes;
      }
      if (data.notifyMessage !== undefined) {
        notifyMessage = data.notifyMessage;
      }
      if (data.arLanguage !== undefined) {
        arLanguage = data.arLanguage;
      }
      if (data.latitude) {
        latitude = data.latitude;
      }
      if (data.longitude) {
        longitude = data.longitude;
      }
    }
  );
}

// Fetch settings and notified times on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ arLanguage: true });
  chrome.storage.local.set({ notifyMessage: false });
  chrome.storage.local.set({ latitude: 21.42664 });
  chrome.storage.local.set({ longitude: 39.82563 });

  getData();
  fetchPrayerTimes();
  // checkPrayerTimes();
});

// Fetch settings and notified times on startup
chrome.runtime.onStartup.addListener(() => {
  getData();
  fetchPrayerTimes();
});

// Fetch prayer times from API
async function fetchPrayerTimes() {
  try {
    const date = new Date()
      .toISOString()
      .split("T")[0]
      .split("-")
      .reverse()
      .join("-");

    if (latitude && longitude) {
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}${
          method ? `&method=${method}` : ""
        }`
      );
      const data = await res.json();
      const { Fajr, Dhuhr, Asr, Maghrib, Isha } = await data.data.timings;
      prayerTimes = { Fajr, Dhuhr, Asr, Maghrib, Isha };
      chrome.storage.local.set({ prayerTimes });
    } else {
      setTimeout(fetchPrayerTimes, 2000);
    }
  } catch (error) {
    console.log("Error fetching prayer times:", error);
    setTimeout(fetchPrayerTimes, 2000);
  }
}

// Listen for messages to update settings
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SET_PRAYER_TIMES") {
    prayerTimes = message.prayerTimes;
    chrome.storage.local.set({ prayerTimes });
  }
  if (message.type === "SET_NOTIFY_MESSAGE") {
    notifyMessage = message.notifyMessage;
    chrome.storage.local.set({ notifyMessage });
  }
  if (message.type === "SET_LANGUAGE") {
    arLanguage = message.arLanguage;
    chrome.storage.local.set({ arLanguage });
  }
  if (message.type === "SET_METHOD") {
    method = message.method;
    chrome.storage.local.set({ method });
  }
  if (message.type === "SET_CITY") {
    if (message.latitude && message.longitude) {
      latitude = message.latitude;
      longitude = message.longitude;
      chrome.storage.local.set({ latitude });
      chrome.storage.local.set({ longitude });
      fetchPrayerTimes();
    }
  }
});

chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.tabs.create({ url: "https://thekr.vercel.app/update" });
  chrome.runtime.reload();
});
