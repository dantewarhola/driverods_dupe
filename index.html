<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Co-driver">
<meta name="theme-color" content="#0d0f12">
<title>Rally Co-driver</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.png">
<link rel="apple-touch-icon" href="icon.png">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<link rel="stylesheet" href="css/app.css">
</head>
<body>
<div id="map"></div>

<!-- ============ PLAN MODE ============ -->
<section id="planPanel" class="card">
  <div class="titlebar">
    <h1>RALLY <b>CO-DRIVER</b></h1>
    <button id="btnSettings" class="chip">Settings</button>
  </div>
  <div class="field">
    <span class="dot start"></span>
    <input id="from" placeholder="Start: your location" autocomplete="off" enterkeyhint="next">
    <button id="btnHere" class="mini" title="Use my location">Me</button>
    <div class="dropdown" id="fromResults"></div>
  </div>
  <div class="field">
    <span class="dot end"></span>
    <input id="to" placeholder="Where to?" autocomplete="off" enterkeyhint="go">
    <button id="btnGo" class="mini primary">Go</button>
    <div class="dropdown" id="toResults"></div>
  </div>
  <div class="hint" id="status">Tip: long-press the map to set a start or destination.</div>
</section>

<button id="btnLocate" class="fab" title="Show my location"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="2"/></svg></button>
<div id="planSpeed" class="speedchip hidden"></div>

<section id="preview" class="sheet hidden">
  <div class="grab"></div>
  <div id="routeOpts"></div>
  <div id="summary"></div>
  <div id="actions">
    <button class="primary big" id="btnDrive">Drive</button>
    <button id="btnSim">Simulate</button>
    <select id="simSpeed">
      <option value="60">60 km/h</option><option value="80" selected>80 km/h</option><option value="100">100 km/h</option><option value="120">120 km/h</option>
    </select>
    <button id="btnNotes" class="chip">Notes</button>
  </div>
  <div id="notelist" class="hidden"></div>
</section>

<!-- ============ DRIVE MODE ============ -->
<div id="driveHud" class="hidden">
  <div id="navBanner">
    <div id="navArrow"></div>
    <div class="navtxt"><div id="navDist"></div><div id="navText"></div></div>
  </div>
  <div id="hudLeft">
    <div id="speedBox"><div id="speed">0</div><div id="speedunit">km/h</div></div>
    <div id="limit" class="hidden"></div>
  </div>
  <div id="hudRight">
    <button id="btnMute" class="round" title="Mute">MUTE</button>
    <button id="btnRecenter" class="round hidden" title="Re-center">CENTER</button>
    <button id="btnStop" class="round danger" title="End drive">END</button>
  </div>
  <div id="rallyPanel">
    <button id="panelToggle" aria-label="Minimize or expand pace notes"><span></span></button>
    <div id="call"><span id="callMain">READY</span><span id="callDist"></span></div>
    <div id="next"></div>
    <div id="driveFoot"><span id="driveMode"></span><span id="remain"></span><span id="gps"></span></div>
  </div>
</div>

<!-- ============ SETTINGS ============ -->
<section id="settings" class="hidden">
  <div class="sheetbody">
    <div class="row between"><b>Settings</b><button id="btnCloseSettings" class="chip">Done</button></div>
    <label>Route</label>
    <div class="toggles">
      <label><input type="checkbox" id="setAvoidHwy"> Avoid highways (back roads)</label>
      <label><input type="checkbox" id="setAvoidTolls"> Avoid tolls</label>
    </div>
    <label>Pace notes</label>
    <select id="setMode"><option value="advanced">Advanced (Left 4, Right 2 tightens)</option><option value="simple">Simple (Easy / Medium / Hard)</option></select>
    <label>Call timing</label>
    <select id="setTiming"><option value="early">Early</option><option value="standard">Standard</option><option value="late">Late</option></select>
    <label>Detail</label>
    <select id="setDetail"><option value="all">All corners</option><option value="no6">Skip 6s (fast bends)</option><option value="major">Only 1-4 (tight corners)</option></select>
    <label>Units</label>
    <select id="setUnits"><option value="imperial">Imperial (mph, feet)</option><option value="metric">Metric (km/h, meters)</option></select>
    <label>Voice</label>
    <select id="setVoice"></select>
    <label>Voice speed</label>
    <select id="setRate"><option value="1">Normal</option><option value="1.15">Quick</option><option value="1.3">Fast</option></select>
    <label>Map style</label>
    <select id="setMap"><option value="dark">Dark (OpenFreeMap)</option><option value="liberty">Color (OpenFreeMap)</option><option value="osm">Standard (OpenStreetMap)</option></select>
    <div class="toggles">
      <label><input type="checkbox" id="setHazards"> Hazards</label>
      <label><input type="checkbox" id="setCameras"> Speed cameras</label>
      <label><input type="checkbox" id="setCrests"> Crests (beta)</label>
      <label><input type="checkbox" id="setCodriver"> Co-driver mode (silent)</label>
    </div>
    <div class="row" style="margin-top:14px"><button id="btnTestVoice" class="grow">Test voice</button></div>
    <p class="hint small">Free services, no API keys: maps by OpenFreeMap &amp; OpenStreetMap, routing by Valhalla (FOSSGIS) with OSRM backup, search by Photon (komoot), road features by Overpass, elevation by Open-Meteo, voice by Kokoro. Calls are computer-generated estimates and can be wrong, late or missing. Watch the road and obey speed limits.</p>
  </div>
</section>

<div id="ctxMenu" class="hidden"><button id="ctxStart">Start here</button><button id="ctxEnd" class="primary">Go here</button></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js"></script>
<script src="js/engine.js"></script>
<script src="js/services.js"></script>
<script src="js/voices.js"></script>
<script src="js/app.js"></script>
</body>
</html>
