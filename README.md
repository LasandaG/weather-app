# Weather App

A simple weather app built with HTML, CSS, and JavaScript. Search for any city or use your current location to see current conditions and a 7-day forecast.

## Features

- City search with live suggestions
- Current weather (temperature, humidity, wind, feels-like)
- 7-day forecast with rain probability
- Use my location button
- Toggle between °C and °F

## How to Run

Open `index.html` in your browser, or start a local server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## APIs Used

All APIs are free and require no API key:

- [Open-Meteo](https://open-meteo.com/) — weather data and city geocoding
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) — reverse geocoding for the location button

## Project Structure

```
weather-app/
├── index.html   # App markup
├── styles.css   # Styles
├── app.js       # API integration and logic
└── README.md
```
