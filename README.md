# Japan Trip Explorer 🗾

An interactive, animated planner for our family's Japan + Singapore trip: a map that flies from day to day, a live cost estimate, seasons and weather, hotel trade-offs, Disney planning, add-on ideas, photo guides for every stop, and a trip chat powered by Claude.

Built in conversation with [Claude](https://claude.ai), one request at a time. No framework: plain HTML, CSS and JavaScript.

## How it works

- **`index.html`**: the whole app in one file.
  - **Map:** [MapLibre GL JS](https://maplibre.org/) with free vector tiles from [OpenFreeMap](https://openfreemap.org/) (OpenStreetMap data). `flyTo()` makes the glides between days.
  - **Routes:** quadratic Bézier curves animated with `requestAnimationFrame`.
  - **Trip engine:** `build()` turns your choices (pace, hotels, season, ideas) into a list of days; `transfer()` routes trains between regions through hubs (Tokyo, Nagoya, Kyoto, Shin-Osaka).
  - **Costs:** `costOf()` adds up flights, hotel nights, tickets, transit and food, with seasonal price factors.
  - **Photos:** [Wikimedia Commons](https://commons.wikimedia.org/), credited to each photographer.
  - **Weather:** 1991–2020 normals from the Japan Meteorological Agency and Singapore's climate records.
  - **State:** your choices are saved per device in `localStorage`.
- **`api/chat.js`**: a Vercel Function that sends questions (plus the current plan) to the [Claude API](https://platform.claude.com/docs/en/api/messages).

## Running your own copy

Deploy to Vercel (Framework: Other, no build step). For the chat, add these environment variables:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Your Claude API key (kept on the server, never sent to the browser) |
| `CHAT_CODE` | Optional family passcode required before chatting |

Costs, travel times and non-official prices in the app are planning estimates, not quotes.
