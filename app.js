const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const elements = {
  searchForm: document.getElementById("search-form"),
  cityInput: document.getElementById("city-input"),
  locationBtn: document.getElementById("location-btn"),
  unitToggle: document.getElementById("unit-toggle"),
  suggestions: document.getElementById("suggestions"),
  status: document.getElementById("status"),
  weatherPanel: document.getElementById("weather-panel"),
  locationName: document.getElementById("location-name"),
  locationDetail: document.getElementById("location-detail"),
  localTime: document.getElementById("local-time"),
  weatherIcon: document.getElementById("weather-icon"),
  currentTemp: document.getElementById("current-temp"),
  weatherDesc: document.getElementById("weather-desc"),
  feelsLike: document.getElementById("feels-like"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  highLow: document.getElementById("high-low"),
  forecastList: document.getElementById("forecast-list"),
};

let unit = "celsius";
let debounceTimer = null;
let activeLocation = null;

const WMO_CODES = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Heavy freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌦️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌨️" },
  67: { label: "Heavy freezing rain", icon: "🌨️" },
  71: { label: "Slight snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Slight rain showers", icon: "🌦️" },
  81: { label: "Moderate rain showers", icon: "🌧️" },
  82: { label: "Violent rain showers", icon: "⛈️" },
  85: { label: "Slight snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", icon: "⛈️" },
};

function getWeatherInfo(code) {
  return WMO_CODES[code] || { label: "Unknown", icon: "🌡️" };
}

function formatTemp(value) {
  if (value == null) return "—";
  const converted = unit === "fahrenheit" ? (value * 9) / 5 + 32 : value;
  const suffix = unit === "fahrenheit" ? "°F" : "°C";
  return `${Math.round(converted)}${suffix}`;
}

function formatWind(speedKmh) {
  if (speedKmh == null) return "—";
  if (unit === "fahrenheit") {
    return `${Math.round(speedKmh * 0.621371)} mph`;
  }
  return `${Math.round(speedKmh)} km/h`;
}

function setStatus(message, type = "") {
  elements.status.textContent = message;
  elements.status.className = `status${type ? ` ${type}` : ""}`;
}

function setLoading(isLoading) {
  elements.searchForm.querySelector(".btn-primary").disabled = isLoading;
  elements.locationBtn.disabled = isLoading;
  elements.cityInput.disabled = isLoading;
}

function hideSuggestions() {
  elements.suggestions.hidden = true;
  elements.suggestions.innerHTML = "";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "json",
  });

  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/reverse?${params}`,
    { headers: { Accept: "application/json" } }
  );

  const address = data.address || {};
  return {
    name: address.city || address.town || address.village || address.county || "Your location",
    admin1: address.state || address.region || "",
    country: address.country || "",
    latitude,
    longitude,
  };
}

async function searchCities(query) {
  const params = new URLSearchParams({
    name: query,
    count: "5",
    language: "en",
    format: "json",
  });

  const data = await fetchJson(`${GEOCODING_URL}?${params}`);
  return data.results || [];
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
  });

  return fetchJson(`${FORECAST_URL}?${params}`);
}

function formatDayName(dateString, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";

  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatLocalTime(timezone) {
  return new Date().toLocaleString(undefined, {
    timeZone: timezone,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderWeather(location, weather) {
  const current = weather.current;
  const daily = weather.daily;
  const info = getWeatherInfo(current.weather_code);

  activeLocation = location;

  elements.locationName.textContent = location.name;
  elements.locationDetail.textContent = [location.admin1, location.country]
    .filter(Boolean)
    .join(", ");
  elements.localTime.textContent = formatLocalTime(weather.timezone);
  elements.weatherIcon.textContent = info.icon;
  elements.currentTemp.textContent = formatTemp(current.temperature_2m);
  elements.weatherDesc.textContent = info.label;
  elements.feelsLike.textContent = `Feels like ${formatTemp(current.apparent_temperature)}`;
  elements.humidity.textContent = `${current.relative_humidity_2m}%`;
  elements.wind.textContent = formatWind(current.wind_speed_10m);
  elements.highLow.textContent = `${formatTemp(daily.temperature_2m_max[0])} / ${formatTemp(daily.temperature_2m_min[0])}`;

  elements.forecastList.innerHTML = daily.time
    .map((date, index) => {
      const dayInfo = getWeatherInfo(daily.weather_code[index]);
      const precip = daily.precipitation_probability_max[index];

      return `
        <div class="forecast-day">
          <span class="forecast-day-name">${formatDayName(date, index)}</span>
          <span class="forecast-icon" aria-hidden="true">${dayInfo.icon}</span>
          <span class="forecast-temps">
            <span class="high">${formatTemp(daily.temperature_2m_max[index])}</span>
            <span class="low">${formatTemp(daily.temperature_2m_min[index])}</span>
          </span>
          <span class="forecast-precip">${precip != null ? `${precip}%` : ""}</span>
        </div>
      `;
    })
    .join("");

  elements.weatherPanel.hidden = false;
  setStatus("");
}

async function loadWeatherForLocation(location) {
  setLoading(true);
  setStatus("Loading weather...", "loading");
  elements.weatherPanel.hidden = true;
  hideSuggestions();

  try {
    const weather = await fetchWeather(location.latitude, location.longitude);
    renderWeather(location, weather);
  } catch (error) {
    setStatus(error.message || "Could not load weather data.", "error");
  } finally {
    setLoading(false);
  }
}

async function handleSearch(event) {
  event.preventDefault();
  const query = elements.cityInput.value.trim();
  if (!query) return;

  setLoading(true);
  setStatus("Searching...", "loading");
  hideSuggestions();

  try {
    const results = await searchCities(query);
    if (!results.length) {
      setStatus(`No results found for "${query}".`, "error");
      return;
    }

    await loadWeatherForLocation(results[0]);
  } catch (error) {
    setStatus(error.message || "Search failed.", "error");
  } finally {
    setLoading(false);
  }
}

function renderSuggestions(results) {
  if (!results.length) {
    hideSuggestions();
    return;
  }

  elements.suggestions.innerHTML = results
    .map(
      (place, index) => `
        <li role="option" tabindex="0" data-index="${index}">
          <div class="suggestion-name">${place.name}</div>
          <div class="suggestion-detail">${[place.admin1, place.country].filter(Boolean).join(", ")}</div>
        </li>
      `
    )
    .join("");

  elements.suggestions.hidden = false;

  elements.suggestions.querySelectorAll("li").forEach((item, index) => {
    const select = () => loadWeatherForLocation(results[index]);
    item.addEventListener("click", select);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter") select();
    });
  });
}

async function handleInputChange() {
  const query = elements.cityInput.value.trim();
  clearTimeout(debounceTimer);

  if (query.length < 2) {
    hideSuggestions();
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const results = await searchCities(query);
      renderSuggestions(results);
    } catch {
      hideSuggestions();
    }
  }, 300);
}

function handleLocationClick() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported in this browser.", "error");
    return;
  }

  setLoading(true);
  setStatus("Getting your location...", "loading");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const location = await reverseGeocode(latitude, longitude);
        await loadWeatherForLocation(location);
      } catch {
        await loadWeatherForLocation({
          name: "Your location",
          latitude,
          longitude,
          country: "",
          admin1: "",
        });
      } finally {
        setLoading(false);
      }
    },
    (error) => {
      setLoading(false);
      const messages = {
        1: "Location access denied.",
        2: "Location unavailable.",
        3: "Location request timed out.",
      };
      setStatus(messages[error.code] || "Could not get your location.", "error");
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
}

function handleUnitToggle() {
  unit = unit === "celsius" ? "fahrenheit" : "celsius";
  elements.unitToggle.textContent = unit === "celsius" ? "°C" : "°F";

  if (activeLocation) {
    loadWeatherForLocation(activeLocation);
  }
}

elements.searchForm.addEventListener("submit", handleSearch);
elements.cityInput.addEventListener("input", handleInputChange);
elements.locationBtn.addEventListener("click", handleLocationClick);
elements.unitToggle.addEventListener("click", handleUnitToggle);

document.addEventListener("click", (event) => {
  if (!elements.suggestions.contains(event.target) && event.target !== elements.cityInput) {
    hideSuggestions();
  }
});

setStatus("Search for a city to get started.");
