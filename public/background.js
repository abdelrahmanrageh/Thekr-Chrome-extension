let prayerTimes = {};
let notifyMessage;
let intervalId;
let arLanguage;
let notifiedTimes = {};
let latitude;
let longitude;

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
      if (data.notifiedTimes) {
        notifiedTimes = data.notifiedTimes;
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
  chrome.storage.local.set({ latitude: 30.8760568 });
  chrome.storage.local.set({ longitude: 29.742604 });

  getData();
  fetchPrayerTimes();
  checkPrayerTimes();
});

// Fetch settings and notified times on startup
chrome.runtime.onStartup.addListener(() => {
  getData();
  fetchPrayerTimes();
  checkPrayerTimes();
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
        `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=5`
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
  if (message.type === "SET_CITY") {
    if (message.latitude && message.longitude) {
      latitude = message.latitude;
      longitude = message.longitude;
      chrome.storage.local.set({ latitude });
      chrome.storage.local.set({ longitude });
      fetchPrayerTimes();
    }
  }

  checkPrayerTimes();
});

// Send message to content script to show alert
function getPrayerTime(currentTime) {
  Object.entries(prayerTimes).forEach(([prayerName, prayerTime]) => {
    if (
      currentTime === prayerTime &&
      notifiedTimes[prayerName] !== currentTime
    ) {
      let message = `It's time for ${prayerName} prayer`;
      if (arLanguage) {
        let arabicPrayerName = prayerName;
        switch (prayerName) {
          case "Fajr":
            arabicPrayerName = "الفجر";
            break;
          case "Dhuhr":
            arabicPrayerName = "الظهر";
            break;
          case "Asr":
            arabicPrayerName = "العصر";
            break;
          case "Maghrib":
            arabicPrayerName = "المغرب";
            break;
          case "Isha":
            arabicPrayerName = "العشاء";
            break;
        }
        message = `حان الآن موعد صلاة ${arabicPrayerName}`;
      }

      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          // Ensure we are not sending messages to chrome:// or edge:// pages
          if (
            !tab.url.startsWith("chrome://") &&
            !tab.url.startsWith("edge://")
          ) {
            chrome.tabs.sendMessage(
              tab.id,
              {
                type: "SHOW_ALERT",
                message: message,
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.log(
                    "Error sending message to content script:",
                    chrome.runtime.lastError
                  );
                } else {
                  notifiedTimes[prayerName] = currentTime;
                  chrome.storage.local.set({ notifiedTimes });
                }
              }
            );
          }
        });
      });
    }
  });
}

// Check prayer times every 25 seconds
const checkPrayerTimes = () => {
  if (intervalId) {
    clearInterval(intervalId);
  }

  if (notifyMessage) {
    intervalId = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (
          tabs[0] &&
          !tabs[0].url.startsWith("chrome://") &&
          !tabs[0].url.startsWith("edge://")
        ) {
          getPrayerTime(currentTime);
        } else {
          console.log(
            "Skipping tab with URL:",
            tabs[0] ? tabs[0].url : "No tab"
          );
        }
      });
    }, 20000);
  }
};

// Reset notified times at midnight
const resetNotifiedTimes = () => {
  const now = new Date();
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0) -
    now;

  setTimeout(() => {
    notifiedTimes = {};

    chrome.storage.local.set(
      {
        notifiedTimes: {},
        notified_الظهر: "",
        notified_العصر: "",
        notified_المغرب: "",
        notified_العشاء: "",
        notified_الفجر: "",
      },
      () => {
        // Error handling for storage operation
        if (chrome.runtime.lastError) {
          console.log(
            "Error resetting notified times:",
            chrome.runtime.lastError
          );
        } else {
          // Recursively call resetNotifiedTimes to set up the next midnight reset
          resetNotifiedTimes();
        }
      }
    );
  }, msUntilMidnight);
};

// Initialize
resetNotifiedTimes();
checkPrayerTimes();
