# Thekr Extension v1.1.2 - Update Notes

## New Features

### 🔔 Reliable Notifications
- Notifications now use Chrome's alarm system instead of intervals
- Notifications work reliably even after hours of browser usage
- No more missed prayer reminders

### ⏱️ Countdown Timer in Popup
- Shows remaining time until next prayer directly in the extension popup
- Updates every second in real-time
- Displays in both English and Arabic (e.g., "Dhuhr in 2h 15m" or "الظهر بعد ساعتين و 15 دقيقة")

### 🏷️ Badge Countdown on Extension Icon
- Extension icon now shows remaining time until next prayer
- Format: "23m" for minutes, "1h" for hours
- Updates automatically every minute

### 🌙 Automatic Daily Refresh
- Prayer times automatically refresh at midnight
- No need to manually update when the day changes

### 📬 Dual Notification System
- System notifications via Chrome's native notification API
- In-page toast notifications on active tabs (when enabled)

## Bug Fixes
- Fixed notification reliability issues after extended browser sessions
- Improved badge update responsiveness when changing cities
