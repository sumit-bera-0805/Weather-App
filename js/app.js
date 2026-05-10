const api_key = "c6f566b1e8d04391711053c7d4144be3" ;
const BASE = "https://api.openweathermap.org/data/2.5/weather";

const $ = (sel) => document.querySelector(sel);

const loading = $("#loading");
let isFetching = false;

const weatherDescriptions = {
  "overcast clouds":
    "‘Overcast clouds’ refer to a sky completely covered by clouds. It usually means dull weather, with very low sunlight and cooler temperatures.",
  "clear sky":
    "A ‘clear sky’ means no clouds at all. Expect bright sunshine and no precipitation.",
  "few clouds":
    "‘Few clouds’ means mostly sunny with occasional cloud patches.",
  "scattered clouds":
    "‘Scattered clouds’ are spread out and cover less than half the sky. It’s typically still bright outside.",
  "broken clouds":
    "‘Broken clouds’ cover more than half the sky but allow some sunshine through.",
  "light rain":
    "‘Light rain’ refers to a gentle rainfall, often short-lived but can still make the surroundings wet.",
  "moderate rain":
    "‘Moderate rain’ is steady and can last a while. It’s more intense than light rain.",
  "heavy rain":
    "‘Heavy rain’ is intense and continuous. Be cautious of flooding in low-lying areas.",
  thunderstorm:
    "‘Thunderstorms’ include lightning, thunder, and usually heavy rain. Stay indoors if possible.",
  mist: "‘Mist’ is a thin layer of fog, reducing visibility but not as dense as fog.",
  // Add more as needed
};

const ui = {
  card: $(".weather-card"),
  notFound: $(".not-found"),
  img: $("#weatherImg"),

  temp: $("#tempValue"),
  feels: $("#feels"),
  desc: $("#desc"),
  humidity: $("#humidity"),
  wind: $("#wind"),
  sunrise: $("#sunrise"),
  sunset: $("#sunset"),

  minTemp: $("#min-temp"),
  maxTemp: $("#max-temp"),
  clouds: $("#clouds"),
  visibility: $("#visibility"),

  lastUpdated: $("#lastUpdated"), // ✅ added this

  showError(msg = "City not found") {
    this.card.hidden = true;
    this.notFound.hidden = false;
    this.notFound.querySelector("p").textContent = msg;
  },

  showWeather(data) {
    // 🔽 Hide popup if it was open from previous search
    descPopup?.classList.add("hidden");
    weatherCard.style.overflowX = "hidden";
    isPopupOpen = false;

    const { main, weather, wind, sys, clouds, visibility } = data;

    this.notFound.hidden = true;
    this.card.hidden = false;

    this.card.classList.remove("fade");
    void this.card.offsetWidth;
    this.card.classList.add("fade");

    this.temp.textContent = `${Math.round(main.temp)}°C`;
    this.feels.textContent = `Feels like ${Math.round(main.feels_like)}°C`;
    this.desc.textContent = weather[0].description;

    const descText = weather[0].description.toLowerCase();
    const popupText =
      weatherDescriptions[descText] ||
      "No additional information available for this weather condition.";
    $("#descPopup .popup-text").textContent = popupText;

    this.minTemp.textContent = `${Math.round(main.temp_min)}°C`;
    this.maxTemp.textContent = `${Math.round(main.temp_max)}°C`;

    this.humidity.textContent = `${main.humidity}%`;
    this.wind.textContent = `${(wind.speed * 3.6).toFixed(1)} km/h`;

    this.clouds.textContent = `${clouds?.all ?? 0}%`;
    this.visibility.textContent = visibility? `${(visibility / 1000).toFixed(1)} km`
                                            : "--";


    const convertTime = (ts) =>
      new Date(ts * 1000).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    this.sunrise.textContent = convertTime(sys.sunrise);
    this.sunset.textContent = convertTime(sys.sunset);

    const iconKey = weather[0].main;
    const iconFile = `assets/${iconMap[iconKey] || "cloud"}.png`;
    $(
      "#weatherIcon"
    ).innerHTML = `<img src="${iconFile}" alt="${iconKey} icon" width="100" height="100">`;

    // ✅ Last updated time
    const now = new Date();
    this.lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  },

  showAQI(aqi) {
    const levels = {
      1: { label: "Good", class: "aqi-good" },
      2: { label: "Satisfactory", class: "aqi-satisfactory" },
      3: { label: "Moderate", class: "aqi-moderate" },
      4: { label: "Poor", class: "aqi-poor" },
      5: { label: "Very Poor", class: "aqi-very-poor" },
      6: { label: "Severe", class: "aqi-severe" },
    };

    const labelSpan = $("#aqiLabel");
    if (!aqi || !levels[aqi]) {
      labelSpan.innerHTML = "--";
      return;
    }

    const { label, class: className } = levels[aqi];
    labelSpan.innerHTML = `
      <span>${label}</span>
      <span class="aqi-badge ${className}" title="${label}"></span>
      <span class="aqi-level">(${aqi})</span>
    `;
  },
};

const iconMap = {
  Clear: "clear",
  Rain: "rain",
  Drizzle: "rain",
  Thunderstorm: "storm",
  Snow: "snow",
  Mist: "mist",
  Smoke: "mist",
  Haze: "mist",
  Fog: "mist",
  Clouds: "cloud",
};

async function fetchWeather(city) {
  const url = `${BASE}?q=${encodeURIComponent(
    city
  )}&units=metric&appid=${api_key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message);
  }
  return res.json();
}

async function fetchAQI(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${api_key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch AQI");
  const data = await res.json();
  return data.list[0].main.aqi;
}

$("#searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // ⛔ block if request already running
  if (isFetching) return;

  const city = $("#searchInput").value.trim();
  if (!city) return ui.showError("Please enter a city");

  isFetching = true; // 🔒 lock

  try {
    const data = await fetchWeather(city);
    ui.showWeather(data);

    localStorage.setItem("lastCity", city);
    $("#cityName").textContent = `${data.name}, ${data.sys.country}`;
    localStorage.setItem("lastWeatherData", JSON.stringify(data));

    const { lat, lon } = data.coord;
    const aqi = await fetchAQI(lat, lon);
    ui.showAQI(aqi);
  } catch (err) {
    console.error("Fetch error:", err);
    ui.showError("Something went wrong. Please try again.");
    $("#aqiLabel").innerHTML = "--";
  } finally {
    isFetching = false; // 🔓 unlock (always runs)
  }
});



window.addEventListener("DOMContentLoaded", async () => {
  const savedData = localStorage.getItem("lastWeatherData");
  const lastCity = localStorage.getItem("lastCity");

  if (lastCity) $("#searchInput").value = lastCity;

  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      ui.showWeather(parsedData);

      const { lat, lon } = parsedData.coord;
      const aqi = await fetchAQI(lat, lon);
      ui.showAQI(aqi);
    } catch (err) {
      console.error("Invalid saved weather data or AQI:", err);
      localStorage.removeItem("lastWeatherData");
      $("#aqiLabel").innerHTML = "--";
    }
  }
});

const staticTextStart = "Search city (e.g. ";
const staticTextEnd = ")";
const placeholders = ["Mumbai", "Pune", "Bengaluru", "Delhi", "Hyderabad"];
let i = 0;

setInterval(() => {
  $(
    "#searchInput"
  ).placeholder = `${staticTextStart}${placeholders[i]}${staticTextEnd}`;
  i = (i + 1) % placeholders.length;
}, 2500);

$(".app-title").addEventListener("click", () => {
  ui.card.hidden = true;
  ui.notFound.hidden = true;
  $("#searchInput").value = "";
  $("#searchInput").focus();
});

function updateNetworkBanner() {
  const banner = $("#offlineBanner");
  if (!navigator.onLine) {
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

updateNetworkBanner();

window.addEventListener("online", updateNetworkBanner);
window.addEventListener("offline", updateNetworkBanner);

$(".close-banner")?.addEventListener("click", () => {
  $("#offlineBanner").classList.add("hidden");
});

// ============ Description Info Popup (ⓘ Icon) ============
const descIcon = $("#descInfoIcon");
const descPopup = $("#descPopup");
const weatherCard = $(".weather-card");
const illustrationContainer = $(".weather-illustration-container"); // <== new

let isPopupOpen = false;

descIcon?.addEventListener("click", (e) => {
  e.stopPropagation();
  descPopup?.classList.toggle("hidden");
  isPopupOpen = !descPopup.classList.contains("hidden");

  if (isPopupOpen) {
    weatherCard.style.overflowX = "visible";
    illustrationContainer?.classList.add("popup-open");
  } else {
    weatherCard.style.overflowX = "hidden";
    illustrationContainer?.classList.remove("popup-open");
  }
});

document.addEventListener("click", (e) => {
  if (
    isPopupOpen &&
    !descPopup?.contains(e.target) &&
    e.target !== descIcon
  ) {
    descPopup?.classList.add("hidden");
    weatherCard.style.overflowX = "hidden";
    illustrationContainer?.classList.remove("popup-open");
    isPopupOpen = false;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isPopupOpen) {
    descPopup?.classList.add("hidden");
    weatherCard.style.overflowX = "hidden";
    illustrationContainer?.classList.remove("popup-open");
    isPopupOpen = false;
  }
});
