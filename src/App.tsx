import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";
import icon from "../public/icons/icon128.png";
import {
  egyptCitiesCoordinates,
  // egyptCitiesCoordinates,
  egyptCitiesCoordinatesArabic,
} from "./governorates";

type PryerTimes = {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

function App() {
  const [fullDate, setFullDate] = useState("");
  const [latitude, setLatitude] = useState(
    +window.localStorage.getItem("latitude")! || 30.8760568
  );
  const [longitude, setLongitude] = useState(
    +window.localStorage.getItem("longitude")! || 29.742604
  );
  const [city, setCity] = useState(
    window.localStorage.getItem("city") || "Alexandria"
  );
  const [prayerTimes, setPrayerTimes] = useState<PryerTimes>(
    JSON.parse(window.localStorage.getItem("prayerTimes")!) ?? {}
  );
  const [twentyFourHour, setTwentyFourHour] = useState(
    JSON.parse(window.localStorage.getItem("twentyFourHour")!) ?? false
  );
  const [arLanguage, setArLanguage] = useState(
    JSON.parse(window.localStorage.getItem("arLanguage")!) ?? true
  );
  const [cities, setCities] = useState(egyptCitiesCoordinatesArabic);

  const [notifyMessage, setNotifyMessage] = useState(
    JSON.parse(window.localStorage.getItem("notifyMessage")!) ?? false
  );
  // const [sound, setSound] = useState(
  //   JSON.parse(window.localStorage.getItem("sound")!) ?? false
  // );
  const [nextPrayer, setNextPrayer] = useState("");

  useEffect(() => {
    arLanguage
      ? setCities(egyptCitiesCoordinatesArabic)
      : setCities(egyptCitiesCoordinates);
  }, [arLanguage]);

  useEffect(() => {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const fullDate = `${day}-${month}-${year}`;
    setFullDate(fullDate);
  }, []);

  // getting prayer times on change
  useEffect(() => {
    if (latitude && longitude && fullDate) {
      getPrayerTimes(fullDate, latitude, longitude);
    }
  }, [fullDate]);

  useEffect(() => {
    if (latitude && longitude && fullDate)
      getPrayerTimes(fullDate, latitude, longitude);
  }, [latitude, longitude, fullDate]);

  // setting next prayer
  useEffect(() => {
    if (prayerTimes) {
      for (const [prayerName, prayerTime] of Object.entries(prayerTimes)) {
        const [hours, minutes] = prayerTime.split(":");
        const prayerDate = new Date();
        prayerDate.setHours(+hours);
        prayerDate.setMinutes(+minutes);
        if (prayerDate >= new Date()) {
          setNextPrayer(prayerName);
          break;
        }
      }
    }
  }, [prayerTimes, fullDate]);

  async function getPrayerTimes(
    date: string,
    latitude: number,
    longitude: number
  ) {
    try {
      const res = await axios.get(
        `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=5`
      );
      const { Fajr, Dhuhr, Asr, Maghrib, Isha } = await res.data.data.timings;
      // console.log(res.data.data.timings);
      // const timings = {
      //   Fajr: "10:39",
      //   Dhuhr: "10:40",
      //   Asr: "10:41",
      //   Maghrib: "10:42",
      //   Isha: "10:43",
      // };
      const timings = { Fajr, Dhuhr, Asr, Maghrib, Isha };
      // console.log(timings);

      setPrayerTimes(timings);
      window.localStorage.setItem("prayerTimes", JSON.stringify(timings));

      if (notifyMessage) {
        chrome.runtime.sendMessage({
          type: "SET_PRAYER_TIMES",
          prayerTimes: timings,
        });
        chrome.storage.local.set({ prayerTimes: timings });
      }
    } catch (err) {
      console.log(err);
    }
  }

  // 24-hour button // done
  // notification button on-off // done
  // sound on-off
  // language button // done

  return (
    <>
      <div className="flex flex-col  w-full overflow-y-hidden p-1">
        <div className="flex justify-between items-center mb-5 w-full">
          <img className="w-14 h-14  " src={icon} alt="" />
          <div className="flex flex-col">
            {/* Language button */}
            <button
              className="bg-blue-95 text-[#fae3bb] my-1"
              onClick={() => {
                const newLanguage = !arLanguage;
                setArLanguage(newLanguage);
                window.localStorage.setItem(
                  "arLanguage",
                  JSON.stringify(newLanguage)
                );
                chrome.runtime.sendMessage({
                  type: "SET_LANGUAGE",
                  arLanguage: newLanguage,
                });
              }}
            >
              {!arLanguage ? "اللغة العربية" : "English"}
            </button>

            {/* 24-hour button */}
            <button
              className="bg-blue-95 text-[#fae3bb] my-1"
              onClick={() => {
                setTwentyFourHour(!twentyFourHour);
                window.localStorage.setItem(
                  "twentyFourHour",
                  JSON.stringify(!twentyFourHour)
                );
              }}
            >
              {twentyFourHour ? "12-hour" : "24-hour"}
            </button>
          </div>
        </div>

        {/* Cities dropdown */}
        <select
          name="city"
          className="bg-transparent border-b-2 py-2 cursor-pointer border-gray-400 text-3xl "
          dir={arLanguage ? "rtl" : "ltr"}
          onChange={(e) => {
            const { city, latitude, longitude } = JSON.parse(e.target.value);
            setCity(city);
            window.localStorage.setItem("city", city);
            setLatitude(latitude);
            setLongitude(longitude);
            window.localStorage.setItem("latitude", latitude);
            window.localStorage.setItem("longitude", longitude);
            chrome.runtime.sendMessage({
              type: "SET_CITY",
              latitude,
              longitude,
            });
          }}
          value={JSON.stringify({ city, latitude, longitude })}
        >
          {cities.map((city) => (
            <option
              key={city.city}
              value={JSON.stringify(city)}
              className="bg-gray-800 text-base font-light "
            >
              {city.city}
            </option>
          ))}
        </select>

        {prayerTimes ? (
          <div className="text-xl mt-10 w-full text-left ">
            {Object.entries(prayerTimes).map(([prayerName, prayerTime]) => (
              <div
                key={prayerName}
                dir={arLanguage ? "rtl" : "ltr"}
                className="my-2 flex w-full justify-between"
              >
                <p
                  className={`${
                    nextPrayer === prayerName ? "text-[#fae3bb]" : ""
                  }`}
                >
                  {!arLanguage
                    ? prayerName
                    : prayerName === "Fajr"
                    ? "الفجر"
                    : prayerName === "Dhuhr"
                    ? "الظهر"
                    : prayerName === "Asr"
                    ? "العصر"
                    : prayerName === "Maghrib"
                    ? "المغرب"
                    : prayerName === "Isha"
                    ? "العشاء"
                    : ""}
                </p>
                <p
                  className={`${
                    nextPrayer === prayerName ? "text-[#fae3bb]" : ""
                  }`}
                  dir={"ltr"}
                >
                  {twentyFourHour
                    ? prayerTime
                    : new Date(`2024-01-01T${prayerTime}`).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        }
                      )}
                </p>
              </div>
            ))}
            <div
              dir={!arLanguage ? "rtl" : "ltr"}
              className="flex flex-col mt-10"
            >
              <label className="inline-flex justify-between  items-center mb-3 cursor-pointer">
                {/* Notification button */}
                <input
                  onChange={() => {
                    const newNotifyMessage = !notifyMessage;
                    window.localStorage.setItem(
                      "notifyMessage",
                      JSON.stringify(newNotifyMessage)
                    );
                    setNotifyMessage(newNotifyMessage);
                    chrome.runtime.sendMessage({
                      type: "SET_NOTIFY_MESSAGE",
                      notifyMessage: newNotifyMessage,
                    });
                  }}
                  checked={notifyMessage}
                  type="checkbox"
                  className="sr-only peer"
                />
                <div
                  dir="ltr"
                  className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-100 dark:peer-focus:ring-blue-00 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full  peer-checked:after:border-red-300 after:content-[''] after:absolute after:top-[2px] after:start-[2px] peer-checked:after:bg-yellow-900 after:bg-yellow-900 after:border-red-200 after:border after:rounded-full after:w-5 after:h-5 after:transition-all dark:border-yellow-600 peer-checked:bg-[#fae3bb]"
                ></div>
                <span className="ms-3 text-lg font-medium text-gray-900 dark:text-gray-300">
                  {!arLanguage ? "Prayer Notification " : "إشعار الصلاة"}
                </span>
              </label>
              <p className="text-gray-500  text-xs text-center font-thin -mt-2">
                {arLanguage
                  ? "يظهر تلقائيا في موعد الصلاة ويختفي بعد دقيقة"
                  : "appears automatically at prayer time, disappears after one minute"}
              </p>
            </div>
          </div>
        ) :
        // skeleton
          (
          <div>
            <div
              dir={arLanguage ? "rtl" : "ltr"}
              className="my-2 flex w-full justify-between"
            >
              <p className="h-1.5 mb-1 mt-5 rounded-lg w-24 bg-gray-500 animate-pulse"></p>
              <p className="h-1.5 mb-1 mt-5 rounded-lg w-14 bg-gray-500 animate-pulse"></p>
            </div>
            <div
              dir={arLanguage ? "rtl" : "ltr"}
              className="my-2 flex w-full justify-between"
            >
              <p className="h-1.5  rounded-lg w-24 bg-gray-500 animate-pulse"></p>
              <p className="h-1.5 my-1 rounded-lg w-14 bg-gray-500 animate-pulse"></p>
            </div>
            <div
              dir={arLanguage ? "rtl" : "ltr"}
              className="my-2 flex w-full justify-between"
            >
              <p className="h-1.5  rounded-lg w-24 bg-gray-500 animate-pulse"></p>
              <p className="h-1.5 my-1 rounded-lg w-14 bg-gray-500 animate-pulse"></p>
            </div>
            <div
              dir={arLanguage ? "rtl" : "ltr"}
              className="my-2 flex w-full justify-between"
            >
              <p className="h-1.5  rounded-lg w-24 bg-gray-500 animate-pulse"></p>
              <p className="h-1.5 my-1 rounded-lg w-14 bg-gray-500 animate-pulse"></p>
            </div>
            <div
              dir={arLanguage ? "rtl" : "ltr"}
              className="my-2 flex w-full justify-between"
            >
              <p className="h-1.5  rounded-lg w-24 bg-gray-500 animate-pulse"></p>
              <p className="h-1.5 my-1 rounded-lg w-14 bg-gray-500 animate-pulse"></p>
            </div>

            <div
              dir={arLanguage ? "rtl" : "ltr"}
              className="my-2 flex w-full justify-between items-center"
            >
              <p className="h-3  rounded-lg w-32 mt-10 bg-gray-500 animate-pulse"></p>
              <p className="h-6 my-1 rounded-full mt-10 w-12 bg-gray-500 animate-pulse"></p>
            </div>
          </div>
        )}
      </div>
      <div
        className="absolute -right-0 -z-10 top-0 -mt-40  blur-3xl xl:-top-6 dark:bg-slate-950"
        aria-hidden="true"
      >
        <div
          className="aspect-[955/1078] w-[60rem] bg-gradient-to-tr from-purple-600 to-yellow-500 opacity-20 blur-3xl"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
    </>
  );
}

export default App;
