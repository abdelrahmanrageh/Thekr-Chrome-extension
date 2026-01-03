// {
let prayerTimes = {};
let arLanguage = true;
let notifyMessage = true;
let notifiedTimes = {
  Fajr: false,
  Dhuhr: false,
  Asr: false,
  Maghrib: false,
  Isha: false,
};

function updateData() {
  chrome.storage.local.get(
    ["prayerTimes", "arLanguage", "notifyMessage"],
    (data) => {
      if (data.prayerTimes) {
        prayerTimes = data.prayerTimes;
      }
      if (data.arLanguage !== undefined) {
        arLanguage = data.arLanguage;
      }
      if (data.notifyMessage !== undefined) {
        notifyMessage = data.notifyMessage;
      }
    }
  );
}

// Looping through the prayer times and checking if the current time matches any of them
function getPrayerTime(currentTime) {
  Object.entries(prayerTimes).forEach(([prayerName, prayerTime]) => {
    if (
      currentTime === prayerTime
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
      if (notifyMessage) createToasterNotification(message, prayerName);
    }
  });
}

// Check prayer times every 20 seconds
let intervalId;
const checkPrayerTimes = () => {
  updateData();

  if (intervalId) {
    clearInterval(intervalId);
  }

  if (notifyMessage) {
    intervalId = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${hours}:${minutes}`;

      getPrayerTime(currentTime);
    }, 20000);
  }
};
checkPrayerTimes();

const includeGoogleFont = () => {
  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap";
  link.rel = "stylesheet";

  const appendFontLink = () => {
    if (document.head) {
      document.head.appendChild(link);
    } else {
      setTimeout(appendFontLink, 1000); // Retry after 1 second
    }
  };

  // Check if document is already loaded
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    appendFontLink();
  } else {
    // Wait for the document to be ready
    document.addEventListener("DOMContentLoaded", appendFontLink);
  }
};

// Create a toaster notification element
const createToasterNotification = (message, prayerName) => {

  const container = document.createElement("div");
  container.id = "toaster-container";
  container.style.position = "fixed";
  container.style.top = "10px";
  container.style.right = "10px";
  container.style.zIndex = "100000";
  container.style.display = "flex";
  container.style.flexDirection = "column";

  const notification = document.createElement("div");
  notification.style.display = "flex";
  notification.style.alignItems = "center";
  notification.style.background = "#000";
  notification.style.color = "#e0e0e0";
  notification.style.width = "250px";
  // notification.style.height = "60px";
  notification.style.padding = "20px";
  notification.style.transition = "all 0.5s";
  notification.style.marginBottom = "5px";
  notification.style.borderRadius = "10px";
  notification.style.boxShadow = "4px 3px 13px #0000008a";
  notification.style.fontSize = "16px";
  notification.style.position = "relative";
  notification.style.fontFamily = "'Rubik', sans-serif";
  notification.style.fontWeight = "500";
  notification.style.direction = "ltr";

  const image = document.createElement("img");
  image.src =
    "https://firebasestorage.googleapis.com/v0/b/ar-gallery-99.appspot.com/o/self%2FGroup%202.png?alt=media&token=3c525224-43fa-496e-83d2-e54f653560e4";
  image.style.width = "35px";
  image.style.height = "35px";
  image.style.marginRight = "10px";
  image.setAttribute("alt", "icon");
  notification.appendChild(image);

  // Close button
  const closeButton = document.createElement("button");
  closeButton.innerText = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "10px";
  closeButton.style.right = "10px";
  closeButton.style.fontSize = "18px";
  closeButton.style.border = "none";
  closeButton.style.background = "transparent";
  closeButton.style.color = "#fff";
  closeButton.style.cursor = "pointer";
  closeButton.style.padding = "0";
  closeButton.onclick = () => notification.remove();

  notification.appendChild(closeButton);
  notification.appendChild(document.createTextNode(message));
  
  if (container && !notifiedTimes[prayerName]) {
    container.appendChild(notification);
  } else {
    const retry = () => {
      if (container && !notifiedTimes[prayerName]) {
        container.appendChild(notification);
      } else {
        setTimeout(retry, 1000); // Retry after 1 second
      }
    };
    retry();
  }

  // check if the notification has been added to the DOM
  if (!notifiedTimes[prayerName]) { 

    // Add notification to the DOM
    if (document.body) {
      document.body.appendChild(container);
      notifiedTimes = {
        Fajr: false,
        Dhuhr: false,
        Asr: false,
        Maghrib: false,
        Isha: false,
      };
      notifiedTimes[prayerName] = true;
    }
    
    else {
      console.log("Document body not found, retrying...");
      const retry = () => {
        if (document.body) {
          document.body.appendChild(container);
          notifiedTimes = {
            Fajr: false,
            Dhuhr: false,
            Asr: false,
            Maghrib: false,
            Isha: false,
          };
          notifiedTimes[prayerName] = true;
        } else {
          setTimeout(retry, 1000); // Retry after 1 second
        }
      };
      retry();
    }
  }

  // Auto-remove
  setTimeout(() => {
    notification.style.opacity = 0;
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 60000);
};
includeGoogleFont();
