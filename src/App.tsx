import "./App.css";
import { useEffect, useState } from "react";
import axios from "axios";
import icon from "../public/icons/icon128.png";
import { methodsArray, arMethodsArray } from "./methods";
import cities from "./cities.json";

const citiesArray = cities as CityInof[];

type CityInof = {
  name: string;
  alternate_names: string[];
  latitude: string;
  longitude: string;
};

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
    +window.localStorage.getItem("latitude")! || 21.42664
  );
  const [longitude, setLongitude] = useState(
    +window.localStorage.getItem("longitude")! || 39.82563
  );
  const [city, setCity] = useState(
    window.localStorage.getItem("city") || "Mecca, SA"
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
  const [notifyMessage, setNotifyMessage] = useState(
    JSON.parse(window.localStorage.getItem("notifyMessage")!) ?? false
  );
  const [method, setMethod] = useState(
    window.localStorage.getItem("method") || 0
  );
  const [nextPrayer, setNextPrayer] = useState("");
  const [remainingTime, setRemainingTime] = useState("");

  useEffect(() => {
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const fullDate = `${day}-${month}-${year}`;
    setFullDate(fullDate);
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "SET_CITY", latitude, longitude });
    if (latitude && longitude && fullDate)
      getPrayerTimes(fullDate, latitude, longitude);
  }, [latitude, longitude, fullDate]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "SET_NOTIFY_MESSAGE", notifyMessage });
    chrome.runtime.sendMessage({ type: "SET_LANGUAGE", arLanguage });
  }, [notifyMessage, arLanguage]);

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

  // Calculate remaining time until next prayer
  useEffect(() => {
    if (!prayerTimes || Object.keys(prayerTimes).length === 0) return;

    const calculateRemainingTime = () => {
      const now = new Date();
      const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

      let nextPrayerTime: Date | null = null;
      let nextPrayerName = "";
      let minDiff = Infinity;

      prayers.forEach((prayer) => {
        if (prayerTimes[prayer as keyof PryerTimes]) {
          const [hours, minutes] = prayerTimes[prayer as keyof PryerTimes].split(":").map(Number);
          const prayerTime = new Date();
          prayerTime.setHours(hours, minutes, 0, 0);

          let diff = prayerTime.getTime() - now.getTime();

          // If prayer has passed, check tomorrow
          if (diff < 0) {
            prayerTime.setDate(prayerTime.getDate() + 1);
            diff = prayerTime.getTime() - now.getTime();
          }

          if (diff < minDiff) {
            minDiff = diff;
            nextPrayerTime = prayerTime;
            nextPrayerName = prayer;
          }
        }
      });

      if (nextPrayerTime) {
        const diffMinutes = Math.floor(minDiff / 60000);
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        let timeString = "";
        if (hours > 0) {
          timeString = arLanguage
            ? `${hours} ${hours === 1 ? "ساعة" : "ساعات"}${minutes > 0 ? ` و ${minutes} دقيقة` : ""}`
            : `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
        } else {
          timeString = arLanguage
            ? `${minutes} ${minutes === 1 ? "دقيقة" : "دقيقة"}`
            : `${minutes} min`;
        }

        const prayerNameDisplay = arLanguage
          ? nextPrayerName === "Fajr" ? "الفجر"
            : nextPrayerName === "Dhuhr" ? "الظهر"
              : nextPrayerName === "Asr" ? "العصر"
                : nextPrayerName === "Maghrib" ? "المغرب"
                  : nextPrayerName === "Isha" ? "العشاء"
                    : nextPrayerName
          : nextPrayerName;

        const displayText = arLanguage
          ? `${prayerNameDisplay} بعد ${timeString}`
          : `${prayerNameDisplay} in ${timeString}`;

        setRemainingTime(displayText);
      }
    };

    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [prayerTimes, arLanguage]);

  // fetching prayer times
  async function getPrayerTimes(
    date: string,
    latitude: number,
    longitude: number,
    methodBool?: boolean
  ) {
    if (!latitude || !longitude || !date) return;
    try {
      const res = await axios.get(
        `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}${method ? `&method=${method}` : ""
        }`
      );

      // getting prayer times from the response
      const { Fajr, Dhuhr, Asr, Maghrib, Isha } = await res.data.data.timings;
      const timings = { Fajr, Dhuhr, Asr, Maghrib, Isha };

      // getting prayer time method from the response
      const returnedMethod = await res?.data?.data?.meta?.method?.id;
      if (!methodBool) {
        setMethod(returnedMethod);
        window.localStorage.setItem("method", returnedMethod);
        chrome.runtime.sendMessage({
          type: "SET_METHOD",
          method: returnedMethod,
        });
      }

      setPrayerTimes(timings);
      window.localStorage.setItem("prayerTimes", JSON.stringify(timings));
      chrome.runtime.sendMessage({
        type: "SET_PRAYER_TIMES",
        prayerTimes: timings,
      });

    } catch (err) {
      console.log(err);
    }
  }

  // search cities function
  const [filteredCities, setFilteredCities] = useState<CityInof[] | null>(null);
  let timeout: number;
  function searchCities(search: string) {
    setCity(search);
    if (!search) {
      setFilteredCities(null);
      return;
    }
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      const filtered: CityInof[] = [];
      citiesArray.forEach((city) => {
        if (city.name.toLowerCase().startsWith(search.toLowerCase())) {
          filtered.push(city);
        }
      });
      citiesArray.forEach((city) => {
        if (filtered.length > 15) return;
        if (filtered.includes(city)) return;
        if (city.name.toLowerCase().includes(search.toLowerCase())) {
          filtered.push(city);
        } else if (
          city.alternate_names.some((name) =>
            name.toLowerCase().includes(search.toLowerCase())
          )
        ) {
          filtered.push(city);
        }
      });
      setFilteredCities(filtered);
    }, 300);
  }

  // setting method on change
  useEffect(() => {
    window.localStorage.setItem("method", `${method}`);
    getPrayerTimes(fullDate, latitude, longitude);
    chrome.runtime.sendMessage({
      type: "SET_METHOD",
      method: method,
    });
  }, [method]);
  const [restart, setRestart] = useState(false);

  return (
    <>
      <div className="flex flex-col  w-full overflow-y-hidden p-1">
        <div className="flex justify-between items-center mb-5 w-full">
          <img className="w-14 h-14  " src={icon} alt="" />
          <div className="flex flex-col">
            {/* Language button */}
            <button
              className="bg-blue-95 dark:text-[#fae3bb] text-[#dea033] my-1"
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
              className="bg-blue-95 dark:text-[#fae3bb] text-[#dea033]  my-1"
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

        {/* Cities search */}
        <div className="relative">
          <input
            value={city}
            id="search"
            name="city-search"
            type="text"
            autoComplete="off"
            // dir={arLanguage ? "rtl" : "ltr"}
            spellCheck="false"
            placeholder={arLanguage ? "ابحث عن مدينتك" : "Search for your city"}
            className="bg-transparent border-0 outline-0  border-b-2 py-2 overflow-ellipsis cursor-text text-gray-700 dark:text-gray-200 border-gray-400 text-2xl w-full"
            onChange={(e) => searchCities(e.target.value)}
          />

          {/* Suggested cities on search */}
          {filteredCities && filteredCities?.length > 0 && (
            <div className="absolute top-14 w-full pac-container bg-gray-200 max-h-52 overflow-y-scroll">
              {filteredCities.map((city, index) => {
                if (index > 15) return; // limiting the number of suggested cities
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setCity(city.name);
                      window.localStorage.setItem("city", city.name);
                      setLatitude(parseFloat(city.latitude));
                      window.localStorage.setItem("latitude", city.latitude);
                      setLongitude(parseFloat(city.longitude));
                      window.localStorage.setItem("longitude", city.longitude);
                      getPrayerTimes(
                        fullDate,
                        parseFloat(city.latitude),
                        parseFloat(city.longitude)
                      );
                      setFilteredCities(null);
                      setMethod(0);
                      window.localStorage.removeItem("method");
                    }}
                    key={`${city.name}-${city.latitude}-${city.longitude}`}
                    className="text-gray-700 block dark:text-gray-200 w-full text-start pac-item cursor-pointer"
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Prayer Times table */}
        {prayerTimes ? (
          <div className="text-xl mt-10 w-full text-left ">
            {Object.entries(prayerTimes).map(([prayerName, prayerTime]) => (
              <div
                key={prayerName}
                dir={arLanguage ? "rtl" : "ltr"}
                className="my-2 flex w-full justify-between"
              >
                <p
                  className={`text-gray-600 dark:text-gray-200 ${nextPrayer === prayerName
                      ? "!text-[#dea033] dark:!text-[#fae3bb]"
                      : ""
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
                  className={`text-gray-600 dark:text-gray-200 ${nextPrayer === prayerName
                      ? "!text-[#dea033] dark:!text-[#fae3bb]"
                      : ""
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

            {/* Countdown Display */}
            {remainingTime && (
              <div
                dir={arLanguage ? "rtl" : "ltr"}
                className="mt-6 mb-4 p-3 bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-lg border border-yellow-300 dark:border-yellow-700"
              >
                <p className="text-center text-lg font-medium text-gray-800 dark:text-yellow-100">
                  {arLanguage ? "الصلاة القادمة:" : "Next Prayer:"}
                </p>
                <p className="text-center text-2xl font-bold text-yellow-900 dark:text-yellow-200 mt-1">
                  {remainingTime}
                </p>
              </div>
            )}

            {/* Changing Method */}
            <div
              dir={arLanguage ? "rtl" : "ltr"}
              className="text-gray-600 dark:text-gray-300  border-gray-500 mt-2 text-xs w-full text-start font-light"
            >
              {method !== 0 &&
                (arLanguage ? (
                  <span className="font-light">المواقيت حسب: </span>
                ) : (
                  <span className="font-light">Based on: </span>
                ))}
            </div>

            {/* Method selection */}
            <select
              className="text-xs cursor-pointer -mt-0 text-start block w-full -ms-1 me-1 font-normal text-gray-600 dark:text-gray-300 bg-transparent"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
              }}
              name=""
              dir={arLanguage ? "rtl" : "ltr"}
            >
              {arLanguage
                ? arMethodsArray.map(
                  (method) =>
                    method.name !== "" && (
                      <option
                        className="text-sm dark:bg-gray-900 text-gray-700 dark:text-gray-400 font-light "
                        value={method.id}
                        key={method.id}
                      >
                        {method.name}
                      </option>
                    )
                )
                : methodsArray.map(
                  (method) =>
                    method.name !== "" && (
                      <option
                        className="text-sm dark:bg-gray-900 text-gray-700 dark:text-gray-400 font-light "
                        value={method.id}
                        key={method.id}
                      >
                        {method.name}
                      </option>
                    )
                )}
            </select>

            <div
              dir={!arLanguage ? "rtl" : "ltr"}
              className="flex flex-col mt-10"
            >
              <label className="inline-flex justify-between  items-center  mb-3 cursor-pointer">
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
                  onClick={() => {
                    setRestart(!restart);
                  }}
                  checked={notifyMessage}
                  type="checkbox"
                  className="sr-only peer"
                />

                <div
                  dir="ltr"
                  className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-100 dark:peer-focus:ring-blue-00 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full  peer-checked:after:border-red-300 after:content-[''] after:absolute after:top-[2px] after:start-[2px] peer-checked:after:bg-yellow-900 after:bg-yellow-900 after:border-red-200 after:border after:rounded-full after:w-5 after:h-5 after:transition-all dark:border-yellow-600 dark:peer-checked:bg-[#fae3bb] ring-1 ring-yellow-800 dark:ring-0 peer-checked:bg-[#ffd997] "
                ></div>
                <span className="ms-3 text-lg font-medium text-gray-900 dark:text-gray-300">
                  {!arLanguage ? "Prayer Notification " : "إشعار الصلاة"}
                </span>
              </label>

              {restart && (
                <p className="ms-3 text-xs text-end  sr-onl font-light text-gray-900 -mt-3 mb-3 dark:text-red-300">
                  {arLanguage
                    ? "من فضلك أعد تشغيل المتصفح"
                    : "Please restart the browser"}
                </p>
              )}

              <p className="text-gray-500  text-xs text-center  font-thin -mt-2">
                {arLanguage
                  ? "يظهر تلقائيا في موعد الصلاة ويختفي بعد دقيقة"
                  : "appears automatically at prayer time, disappears after one minute"}
              </p>
            </div>
          </div>
        ) : (
          // skeleton
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
