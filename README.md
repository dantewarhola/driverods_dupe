# Rally Co-driver

A rally-style pace-note navigator that runs in your phone's browser. Enter a start and destination and it calls every corner ("Left 4", "Right 2 tightens into left hairpin, 100"), along with turns, roundabouts, bumps, bridges, gravel, crests and speed cameras, timed to your speed.

Everything it uses is free and needs no API keys or accounts.

| What | Service |
| --- | --- |
| Map | OpenFreeMap vector tiles (OpenStreetMap as a fallback) |
| Directions | Valhalla on the FOSSGIS public server (the engine behind openstreetmap.org directions), with OSRM as a backup |
| Search | Photon by komoot (search-as-you-type), with Nominatim as a backup |
| Road features | Overpass API (OpenStreetMap tags) |
| Elevation (crests) | Open-Meteo |
| Voice | Kokoro neural voice clips, built into `js/voices.js` |

## Deploy on GitHub Pages

1. Put every file in this folder in your repo, keeping the folders (`css/`, `js/`).
2. In the repo, go to **Settings → Pages**, choose **Deploy from a branch**, then pick `main` and `/ (root)`.
3. Open `https://<your-username>.github.io/<repo>/` on your phone and allow location access.
4. **iPhone:** tap Share, then **Add to Home Screen**. **Android:** use Chrome's menu, then **Add to Home screen**. It then opens full-screen like an app.

GPS only works over https, which GitHub Pages provides.

## Using it

- Type a destination (suggestions appear as you type). If you leave the start empty, it uses your location. You can also long-press the map to set a start or destination.
- Compare route options (fastest, twistiest), open **Notes** to preview every call, then tap **Drive**. **Simulate** drives the route for you.
- While driving, tap the handle on the pace-note panel to shrink it to one line at the bottom so you can see the map. Tap the bar to expand it again.
- Drag the map to look around; tap **CENTER** to follow the car again.
- Keep the screen on and the app in front: browsers pause GPS and audio when the screen locks.

## Files

- `index.html`: page layout
- `css/app.css`: styles
- `js/engine.js`: pace-note engine (curvature, 1–6 grades, modifiers, hazards, crests, phrasing)
- `js/services.js`: map, routing, search, road features and elevation services
- `js/app.js`: app logic (planning, GPS tracking, drive mode, voice)
- `js/voices.js`: recorded co-driver voices

Calls are computer-generated estimates from map data and can be wrong, late or missing. Watch the road and obey the speed limits.
