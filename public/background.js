let prayerTimes = {};
let notifyMessage;
let arLanguage;
let latitude;
let longitude;
let method;

// Initialize alarms when service worker starts
function initializeAlarms() {
  // Set up badge update alarm (every minute)
  chrome.alarms.create("badgeUpdate", { periodInMinutes: 1 });

  // Set up daily refresh at midnight
  scheduleMidnightRefresh();
}

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
      "method",
    ],
    (data) => {
      if (data.prayerTimes) {
        prayerTimes = data.prayerTimes;
        scheduleAlarms(data.prayerTimes);
        updateBadge(); // Update badge immediately
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
      if (data.method) {
        method = data.method;
      }

      // Ensure alarms are set up
      initializeAlarms();
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
  initializeAlarms();
});

// Fetch settings and notified times on startup
chrome.runtime.onStartup.addListener(() => {
  getData();
  fetchPrayerTimes();
  initializeAlarms();
});

// Initialize when service worker starts (important for persistence)
getData();
initializeAlarms();

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
        `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}${method ? `&method=${method}` : ""
        }`
      );
      const data = await res.json();
      const { Fajr, Dhuhr, Asr, Maghrib, Isha } = await data.data.timings;
      prayerTimes = { Fajr, Dhuhr, Asr, Maghrib, Isha };
      chrome.storage.local.set({ prayerTimes });

      // Schedule alarms for prayer times
      scheduleAlarms(prayerTimes);

      // Update badge immediately
      updateBadge();
    } else {
      setTimeout(fetchPrayerTimes, 2000);
    }
  } catch (error) {
    console.log("Error fetching prayer times:", error);
    setTimeout(fetchPrayerTimes, 2000);
  }
}

// Schedule alarms for each prayer time
function scheduleAlarms(times) {
  if (!times || Object.keys(times).length === 0) return;

  const now = new Date();
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  prayers.forEach((prayer) => {
    if (times[prayer]) {
      const [hours, minutes] = times[prayer].split(":").map(Number);
      const prayerTime = new Date();
      prayerTime.setHours(hours, minutes, 0, 0);

      // If prayer time has passed today, skip it (will be rescheduled tomorrow)
      if (prayerTime > now) {
        chrome.alarms.create(`prayer_${prayer}`, {
          when: prayerTime.getTime(),
        });
      }
    }
  });

  // Update badge immediately after scheduling
  updateBadge();
}

// Schedule daily refresh at midnight
function scheduleMidnightRefresh() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0); // Next midnight

  chrome.alarms.create("midnightRefresh", {
    when: midnight.getTime(),
  });
}

// Show system notification
function showSystemNotification(prayerName, useArabic) {
  const title = useArabic
    ? `حان الآن موعد صلاة ${getPrayerNameArabic(prayerName)}`
    : `It's time for ${prayerName} prayer`;

  const message = useArabic
    ? "حي على الصلاة"
    : "Haya ala al-salah";

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: title,
    message: message,
    priority: 2,
  });
}

// Get Arabic prayer name
function getPrayerNameArabic(prayerName) {
  const arabicNames = {
    Fajr: "الفجر",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء",
  };
  return arabicNames[prayerName] || prayerName;
}

// Notify all open tabs
async function notifyAllTabs(prayerName, useArabic) {
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_PRAYER_NOTIFICATION",
      prayerName: prayerName,
      arLanguage: useArabic,
    }).catch(() => {
      // Ignore errors for tabs without content script
    });
  });
}

// Update badge with remaining time
function updateBadge() {
  if (!prayerTimes || Object.keys(prayerTimes).length === 0) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  const now = new Date();
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  // Find next prayer
  let nextPrayer = null;
  let minDiff = Infinity;

  prayers.forEach((prayer) => {
    if (prayerTimes[prayer]) {
      const [hours, minutes] = prayerTimes[prayer].split(":").map(Number);
      const prayerTime = new Date();
      prayerTime.setHours(hours, minutes, 0, 0);

      let diff = prayerTime - now;

      // If prayer has passed, check tomorrow
      if (diff < 0) {
        prayerTime.setDate(prayerTime.getDate() + 1);
        diff = prayerTime - now;
      }

      if (diff < minDiff) {
        minDiff = diff;
        nextPrayer = prayerTime;
      }
    }
  });

  if (nextPrayer) {
    const diffMinutes = Math.floor(minDiff / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    let badgeText = "";
    if (hours > 0) {
      badgeText = `${hours}h`;
    } else {
      badgeText = `${minutes}m`;
    }

    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "badgeUpdate") {
    updateBadge();
  } else if (alarm.name === "midnightRefresh") {
    fetchPrayerTimes();
    scheduleMidnightRefresh(); // Reschedule for next midnight
  } else if (alarm.name.startsWith("prayer_")) {
    const prayerName = alarm.name.replace("prayer_", "");

    // Show system notification
    showSystemNotification(prayerName, arLanguage);

    // Notify all tabs if message notification is enabled
    if (notifyMessage) {
      notifyAllTabs(prayerName, arLanguage);
    }
  }
});

// Listen for messages to update settings
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SET_PRAYER_TIMES") {
    prayerTimes = message.prayerTimes;
    chrome.storage.local.set({ prayerTimes });
    scheduleAlarms(prayerTimes);
    updateBadge(); // Update badge immediately
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
