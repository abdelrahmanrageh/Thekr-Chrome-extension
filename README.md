# Thekr — Prayer Reminder

Thekr is a Chrome extension that shows daily prayer times for a selected city and can remind you when each prayer begins. It supports Arabic and English, 12- and 24-hour time formats, native browser notifications, an optional in-page notification, and a countdown on the extension icon.

Prayer times are retrieved from the [AlAdhan API](https://aladhan.com/prayer-times-api). The extension includes a city catalog for selecting coordinates; it does not request your device's location.

## Install from source

1. Download or clone this repository.
2. Run `npm install` and then `npm run build`.
3. In Chrome, open `chrome://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select the generated `dist` directory.

To work on the popup locally, run `npm run dev`. The development server is not itself a loadable extension; run the build command to produce `dist`.

## Use

Open the extension popup, search for a city, and select it. Use the controls to change language, time format, and the calculation method. Chrome's notification permission is needed for native prayer alerts. The in-page toast option is off by default.

The extension uses `chrome.storage.local` for settings and prayer times. Its content script currently runs on HTTP and HTTPS pages so the optional in-page toast can appear there. Prayer-time requests go to `api.aladhan.com`.

## Development

Requirements: Node.js and npm.

```sh
npm install
npm run lint
npm run build
```

## Contributing

Please open an issue to discuss larger changes. For a contribution, create a branch, make a focused change, run the lint and build commands above, and open a pull request with a short description of the behavior changed.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
