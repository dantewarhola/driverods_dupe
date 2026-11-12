(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.Engine, SV = window.Services;
  const now = () => performance.now();

  // =====================================================================
  // Settings
  // =====================================================================
  const DEFAULTS = {
    mapStyle: 'dark', mode: 'advanced', timing: 'standard', detail: 'all', units: 'imperial', voice: 'pack:george', rate: '1.15',
    hazards: true, cameras: true, crests: true, codriver: false, avoidHighways: false, avoidTolls: false, panel: 'expanded',
  };
  const S = { ...DEFAULTS };
  try { Object.assign(S, JSON.parse(localStorage.getItem('rally-settings') || '{}')); } catch (e) {}
  if (!S.voice) S.voice = DEFAULTS.voice;
  const save = () => { try { localStorage.setItem('rally-settings', JSON.stringify(S)); } catch (e) {} };

  const bindSel = [['setMap', 'mapStyle'], ['setMode', 'mode'], ['setTiming', 'timing'], ['setDetail', 'detail'], ['setUnits', 'units'], ['setVoice', 'voice'], ['setRate', 'rate']];
  const bindChk = [['setHazards', 'hazards'], ['setCameras', 'cameras'], ['setCrests', 'crests'], ['setCodriver', 'codriver'], ['setAvoidHwy', 'avoidHighways'], ['setAvoidTolls', 'avoidTolls']];
  function fillVoices() {
    const sel = $('setVoice');
    const vs = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter((v) => /^en/i.test(v.lang));
    const packs = window.VOICE_PACKS ? Object.keys(VOICE_PACKS).map((k) => `<option value="pack:${k}">${VOICE_PACKS[k].label}, natural</option>`).join('') : '';
    sel.innerHTML = `<optgroup label="Recorded co-driver voices">${packs}</optgroup><optgroup label="Phone voices"><option value="device">Best phone voice (auto)</option>` +
      vs.map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('') + '</optgroup>';
    sel.value = S.voice;
    if (sel.value !== S.voice) sel.value = DEFAULTS.voice;
  }
  fillVoices();
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = fillVoices;
  bindSel.forEach(([id, k]) => { const el = $(id); if (id !== 'setVoice') el.value = S[k]; el.onchange = () => { S[k] = el.value; save(); onSettingsChanged(k); }; });
  bindChk.forEach(([id, k]) => { const el = $(id); el.checked = !!S[k]; el.onchange = () => { S[k] = el.checked; save(); onSettingsChanged(k); }; });
  $('btnSettings').onclick = () => $('settings').classList.remove('hidden');
  $('btnCloseSettings').onclick = () => $('settings').classList.add('hidden');
  $('settings').onclick = (e) => { if (e.target.id === 'settings') $('settings').classList.add('hidden'); };
  $('btnTestVoice').onclick = async () => { Clip.unlock(); await Clip.load(); speak('left 4 tightens into right 2, 100', true); };
  const noteOpts = () => ({ mode: S.mode, units: S.units, detail: S.detail, hazards: S.hazards, cameras: S.cameras, crests: S.crests });
  function onSettingsChanged(k) {
    if (k === 'mapStyle') swapTiles();
    if ((k === 'avoidHighways' || k === 'avoidTolls') && points.end && !D) planRoute();
    else if (route && !D) renderPreview();
    if (k === 'units') $('speedunit').textContent = imp() ? 'mph' : 'km/h';
  }

  // =====================================================================
  // Units
  // =====================================================================
  const imp = () => S.units === 'imperial';
  const fmtDist = (m) => imp()
    ? (m < 305 ? Math.round((m * 3.281) / 10) * 10 + ' ft' : (m / 1609.34).toFixed(m < 16000 ? 1 : 0) + ' mi')
    : (m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km');
  const fmtSpeed = (ms) => Math.round(imp() ? ms * 2.23694 : ms * 3.6);
  const fmtLimit = (kmh) => (imp() ? Math.round(kmh / 1.609 / 5) * 5 : kmh);
  const fmtTime = (s) => { const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };

  // =====================================================================
  // Map (OpenFreeMap vector tiles, free, no key; OSM raster fallback)
  // =====================================================================
  const OFM = { dark: 'https://tiles.openfreemap.org/styles/dark', liberty: 'https://tiles.openfreemap.org/styles/liberty' };
  const OFM_ATTR = '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
  function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  function makeTiles() {
    const style = OFM[S.mapStyle];
    if (style && L.maplibreGL && window.maplibregl && webglOK()) return L.maplibreGL({ style, attribution: OFM_ATTR });
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' });
  }
  const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([39.5, -98.35], 4);
  let baseLayer = makeTiles().addTo(map);
  function swapTiles() { baseLayer.remove(); baseLayer = makeTiles().addTo(map); }
  const markerLayer = L.layerGroup().addTo(map);
  let routeLine = null, altLines = [], traveledLine = null, startMk = null, endMk = null;

  // =====================================================================
  // Live location (plan mode)
  // =====================================================================
  let lastLoc = null, locWatch = null, meMk = null, meAcc = null, locFirst = false;
  const meIcon = L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
  function showMe(p) {
    const ll = [p.coords.latitude, p.coords.longitude];
    lastLoc = { lat: ll[0], lon: ll[1], acc: p.coords.accuracy, speed: p.coords.speed, t: Date.now() };
    if (D) return;
    if (!meMk) { meMk = L.marker(ll, { icon: meIcon, interactive: false }).addTo(map); meAcc = L.circle(ll, { radius: p.coords.accuracy, color: '#4096ff', weight: 1, fillOpacity: .1, interactive: false }).addTo(map); }
    meMk.setLatLng(ll); meAcc.setLatLng(ll).setRadius(p.coords.accuracy || 0);
    if (locFirst) { locFirst = false; map.setView(ll, Math.max(map.getZoom(), 14)); }
    const sp = p.coords.speed;
    $('planSpeed').classList.toggle('hidden', sp == null);
    if (sp != null) $('planSpeed').innerHTML = `${fmtSpeed(sp)}<small>${imp() ? 'mph' : 'km/h'}</small>`;
  }
  function startLocate(center) {
    if (!navigator.geolocation) { status('This browser has no location access.'); return; }
    locFirst = !!center;
    if (locWatch != null) { if (center && lastLoc) map.setView([lastLoc.lat, lastLoc.lon], Math.max(map.getZoom(), 14)); return; }
    $('btnLocate').classList.add('on');
    locWatch = navigator.geolocation.watchPosition(showMe, (err) => status('Location: ' + err.message + (location.protocol !== 'https:' ? ' (page must be on https)' : '')), { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }
  function stopLocate() {
    if (locWatch != null) navigator.geolocation.clearWatch(locWatch);
    locWatch = null; $('btnLocate').classList.remove('on'); $('planSpeed').classList.add('hidden');
    if (meMk) { meMk.remove(); meAcc.remove(); meMk = meAcc = null; }
  }
  $('btnLocate').onclick = () => startLocate(true);
  function getHere() {
    return new Promise((res, rej) => {
      if (lastLoc && Date.now() - lastLoc.t < 30000) return res({ lat: lastLoc.lat, lon: lastLoc.lon, label: 'My location' });
      if (!navigator.geolocation) return rej(new Error('No location access in this browser.'));
      navigator.geolocation.getCurrentPosition(
        (p) => { showMe(p); res({ lat: p.coords.latitude, lon: p.coords.longitude, label: 'My location' }); },
        (err) => rej(new Error('Could not get your location: ' + err.message)),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
    });
  }
  // try quietly at load if permission was already granted
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') startLocate(true); }).catch(() => {});
  }

  // =====================================================================
  // Search & points
  // =====================================================================
  const points = { start: null, end: null };
  const status = (t) => { $('status').textContent = t; };
  function setPoint(which, p) {
    points[which] = p;
    $(which === 'start' ? 'from' : 'to').value = p ? p.label : '';
    const mk = which === 'start' ? 'startMk' : 'endMk';
    if (which === 'start') { if (startMk) startMk.remove(); startMk = p && p.label !== 'My location' ? L.circleMarker([p.lat, p.lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#52c41a', fillOpacity: 1 }).addTo(map) : null; }
    else { if (endMk) endMk.remove(); endMk = p ? L.circleMarker([p.lat, p.lon], { radius: 8, color: '#fff', weight: 2, fillColor: '#ff4d4f', fillOpacity: 1 }).addTo(map) : null; }
  }
  function setupSearch(inputId, listId, which) {
    const input = $(inputId), list = $(listId);
    let timer = null, seq = 0, results = [];
    const render = () => {
      list.innerHTML = results.map((r, k) => `<button data-k="${k}">${esc(r.label)}<span class="sub">${esc(r.sub || '')}</span></button>`).join('');
      list.querySelectorAll('button').forEach((b) => {
        b.onmousedown = (e) => e.preventDefault();
        b.onclick = () => { const r = results[+b.dataset.k]; setPoint(which, { lat: r.lat, lon: r.lon, label: r.label }); list.innerHTML = ''; input.blur(); map.setView([r.lat, r.lon], Math.max(map.getZoom(), 12)); if (which === 'end' || points.end) planRoute(); };
      });
    };
    input.oninput = () => {
      points[which] = null;
      clearTimeout(timer);
      const q = input.value;
      if (q.trim().length < 3) { list.innerHTML = ''; return; }
      timer = setTimeout(async () => {
        const my = ++seq;
        const c = lastLoc || (map.getZoom() >= 6 ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : null);
        try { const r = await SV.search(q, c); if (my === seq) { results = r; render(); } } catch (e) {}
      }, 300);
    };
    input.onkeydown = async (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!results.length && input.value.trim()) { try { results = await SV.search(input.value, lastLoc); } catch (x) {} }
      if (results.length) list.querySelector('button') ? list.querySelector('button').click() : (render(), list.querySelector('button') && list.querySelector('button').click());
      else if (which === 'end') planRoute();
    };
    input.onblur = () => setTimeout(() => { list.innerHTML = ''; }, 150);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  setupSearch('from', 'fromResults', 'start');
  setupSearch('to', 'toResults', 'end');
  $('btnHere').onclick = async () => { try { setPoint('start', await getHere()); startLocate(false); } catch (e) { status(e.message); } };
  $('btnGo').onclick = () => planRoute();

  // long-press (or right-click) the map to set start/end
  let ctxLatLng = null;
  map.on('contextmenu', (e) => {
    if (D) return;
    ctxLatLng = e.latlng;
    const m = $('ctxMenu');
    m.style.left = e.containerPoint.x + 'px'; m.style.top = e.containerPoint.y + 'px';
    m.classList.remove('hidden');
  });
  map.on('click movestart', () => $('ctxMenu').classList.add('hidden'));
  const ctxLabel = (ll) => `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`;
  $('ctxStart').onclick = () => { setPoint('start', { lat: ctxLatLng.lat, lon: ctxLatLng.lng, label: ctxLabel(ctxLatLng) }); $('ctxMenu').classList.add('hidden'); if (points.end) planRoute(); };
  $('ctxEnd').onclick = () => { setPoint('end', { lat: ctxLatLng.lat, lon: ctxLatLng.lng, label: ctxLabel(ctxLatLng) }); $('ctxMenu').classList.add('hidden'); planRoute(); };

  async function resolve(which) {
    if (points[which]) return points[which];
    const input = $(which === 'start' ? 'from' : 'to');
    const q = input.value.trim();
    if (which === 'start' && (!q || /^my location$/i.test(q))) { const p = await getHere(); setPoint('start', p); return p; }
    if (!q) throw new Error('Enter a destination.');
    const r = await SV.search(q, lastLoc);
    if (!r.length) throw new Error(`No place found for "${q}".`);
    const p = { lat: r[0].lat, lon: r[0].lon, label: r[0].label };
    setPoint(which, p);
    return p;
  }

  // =====================================================================
  // Route planning
  // =====================================================================
  let options = [], selected = 0, route = null, building = false;

  async function planRoute() {
    if (building) return;
    building = true; $('btnGo').disabled = true;
    try {
      const a = await resolve('start');
      const b = await resolve('end');
      status('Finding routes...');
      const raw = await SV.routes(a, b, { avoidHighways: S.avoidHighways, avoidTolls: S.avoidTolls });
      options = raw.map((r) => {
        const prep = E.prepare(r.latlngs);
        const quick = E.build(prep, { steps: r.steps });
        const corners = quick.notes.filter((n) => n.kind === 'corner');
        return { ...r, prep, quickB: quick, from: a, to: b, corners: corners.length, tight: corners.filter((c) => c.grade <= 3).length, perKm: corners.length / Math.max(0.5, prep.length / 1000), full: null };
      });
      const fastest = options.reduce((m, o, i) => (o.duration < options[m].duration ? i : m), 0);
      const twisty = options.reduce((m, o, i) => (o.perKm > options[m].perKm ? i : m), 0);
      options.forEach((o, i) => { o.tags = []; if (i === fastest) o.tags.push('FASTEST'); if (i === twisty && options.length > 1) o.tags.push('TWISTIEST'); });
      selectOption(fastest); // corners show at once; road features keep loading in the background
    } catch (e) { status(e.message || String(e)); }
    finally { building = false; $('btnGo').disabled = false; }
  }

  // Road features (bumps, bridges, surfaces, limits) and elevation (crests), fetched in parallel.
  function fullBuild(o) {
    if (o.fullP) return o.fullP;
    o.fullP = (async () => {
      const warn = [];
      let osm = null, elevation = null;
      if (o.prep.length <= 300000) {
        // public servers can be busy: one quiet retry after a short pause
        const retry = (fn) => fn().catch(() => new Promise((r) => setTimeout(r, 10000)).then(fn));
        const [a, b] = await Promise.allSettled([retry(() => SV.roadFeatures(o.prep.samples)), retry(() => SV.elevation(o.prep.samples))]);
        if (a.status === 'fulfilled') osm = a.value; else warn.push('road features unavailable (map servers busy)');
        if (b.status === 'fulfilled') elevation = b.value; else warn.push('elevation unavailable');
      } else warn.push('over 300 km: corners and turns only');
      const built = E.build(o.prep, { steps: o.steps, osm, elevation });
      o.full = { notes: built.notes, limits: built.limits, warn };
      return o.full;
    })();
    return o.fullP;
  }

  function quickNotes(o) {
    if (!o.quickB) o.quickB = E.build(o.prep, { steps: o.steps });
    return o.quickB;
  }

  async function selectOption(i) {
    selected = i;
    const o = options[i];
    renderOptions();
    drawRoutes();
    // corners and turns are ready instantly; hazards, limits and crests are added when they arrive
    const base = o.full || quickNotes(o);
    route = { prep: o.prep, notes: base.notes, limits: base.limits, latlngs: o.latlngs, duration: o.duration, maneuvers: o.maneuvers, from: o.from, to: o.to, source: o.source };
    renderPreview();
    if (o.full) { status(o.full.warn.length ? 'Note: ' + o.full.warn.join(', ') : `Route by ${o.source}. Ready to drive.`); return; }
    status(`Route by ${o.source}. Corners ready. Loading bumps, bridges, speed limits and crests...`);
    const full = await fullBuild(o);
    if (options[selected] !== o || !route || route.prep !== o.prep) return;
    route.notes = full.notes; route.limits = full.limits;
    if (D) { // already driving: don't repeat calls already made
      const sNow = D.sEst || 0;
      D.spoken = new Set(full.notes.filter((n) => n.s < sNow + 150).map((n) => n.id));
      D.ptr = 0;
    } else renderPreview();
    status(full.warn.length ? 'Note: ' + full.warn.join(', ') : `Route by ${o.source}. Hazards and limits loaded. Ready to drive.`);
  }

  function renderOptions() {
    const box = $('routeOpts');
    box.innerHTML = options.map((o, i) => `<button class="ropt ${i === selected ? 'sel' : ''}" data-i="${i}">
      <div class="t">${fmtTime(o.duration)}</div><div class="m">${fmtDist(o.prep.length)} · ${o.corners} corners · ${o.tight} tight</div>
      ${o.tags.map((t) => `<span class="tag ${t === 'TWISTIEST' ? 'tw' : ''}">${t}</span>`).join('')}</button>`).join('');
    box.querySelectorAll('.ropt').forEach((b) => { b.onclick = () => { if (+b.dataset.i !== selected) selectOption(+b.dataset.i); }; });
    $('preview').classList.remove('hidden'); document.body.classList.add('has-preview');
  }

  function drawRoutes() {
    altLines.forEach((l) => l.remove()); altLines = [];
    if (routeLine) routeLine.remove();
    options.forEach((o, i) => {
      if (i === selected) return;
      const l = L.polyline(o.latlngs, { color: '#7d8796', weight: 5, opacity: .7 }).addTo(map);
      l.on('click', () => selectOption(i));
      altLines.push(l);
    });
    routeLine = L.polyline(options[selected].latlngs, { color: '#4096ff', weight: 6, opacity: .95 }).addTo(map);
    const pad = { paddingTopLeft: [20, 170], paddingBottomRight: [20, window.innerHeight * 0.46 + 20] };
    map.fitBounds(routeLine.getBounds(), pad);
  }

  const gradeColor = (g) => (g <= 2 ? '#ff4d4f' : g <= 4 ? '#ffa940' : '#52c41a');
  const noteCls = (n) => (n.kind === 'corner' ? (n.junction ? 'nv' : 'g' + n.grade) : n.kind === 'junction' || n.kind === 'keep' || n.kind === 'roundabout' ? 'nv' : n.kind === 'finish' ? '' : 'hz');
  function renderPreview() {
    if (!route) return;
    const o = noteOpts();
    markerLayer.clearLayers();
    const vis = route.notes.filter((n) => E.noteVisible(n, o));
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let hz = 0;
    for (const n of vis) {
      const p = route.prep.samples[n.i0] || route.prep.samples[0];
      if (n.kind === 'corner') {
        counts[n.grade]++;
        if (n.grade <= 4) L.circleMarker([p.lat, p.lon], { radius: n.grade <= 2 ? 6 : 4, color: gradeColor(n.grade), weight: 2, fillOpacity: .9 }).bindPopup(E.noteWords(n, o).toUpperCase()).addTo(markerLayer);
      } else if (n.kind === 'hazard' || n.kind === 'crest') {
        hz++;
        L.circleMarker([p.lat, p.lon], { radius: 5, color: '#69b1ff', weight: 2, fillOpacity: .9 }).bindPopup(E.noteWords(n, o).toUpperCase()).addTo(markerLayer);
      }
    }
    const sev = S.mode === 'simple'
      ? `<span class="g1">Hard <b>${counts[1] + counts[2]}</b></span><span class="g3">Medium <b>${counts[3] + counts[4]}</b></span><span class="g5">Easy <b>${counts[5] + counts[6]}</b></span>`
      : [1, 2, 3, 4, 5, 6].map((g) => `<span class="g${g}">${g}s <b>${counts[g]}</b></span>`).join('');
    $('summary').innerHTML = `<span><b>${fmtDist(route.prep.length)}</b> · <b>${fmtTime(route.duration)}</b></span>${sev}<span class="hz">Hazards <b>${hz}</b></span>`;
    $('notelist').innerHTML = vis.map((n) => `<div class="n" data-i="${n.i0}"><span class="d">${fmtDist(n.s)}</span><span class="${noteCls(n)}">${esc(E.noteWords(n, o).toUpperCase())}</span></div>`).join('');
    $('notelist').querySelectorAll('.n').forEach((el) => { el.onclick = () => { const p = route.prep.samples[+el.dataset.i]; if (p) map.setView([p.lat, p.lon], 17); }; });
    $('preview').classList.remove('hidden'); document.body.classList.add('has-preview');
  }
  $('btnNotes').onclick = () => { $('notelist').classList.toggle('hidden'); $('btnNotes').classList.toggle('on'); };

  // =====================================================================
  // Recorded co-driver voice (Kokoro clips, stitched) + phone voice fallback
  // =====================================================================
  const Clip = {
    ctx: null, pack: null, buffers: {}, loading: null, active: [],
    packName() { return (S.voice || '').startsWith('pack:') ? S.voice.slice(5) : null; },
    unlock() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start(0);
    },
    load() {
      const name = this.packName();
      if (!name || !this.ctx || !window.VOICE_PACKS || !VOICE_PACKS[name]) return Promise.resolve(false);
      if (this.pack === name && this.loading) return this.loading;
      this.pack = name; this.buffers = {};
      const clips = VOICE_PACKS[name].clips, ctx = this.ctx, bufs = this.buffers;
      this.loading = Promise.all(Object.keys(clips).map((k) => {
        const bin = atob(clips[k]), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return new Promise((res) => ctx.decodeAudioData(u8.buffer, (b) => { bufs[k] = b; res(); }, () => res()));
      })).then(() => true);
      return this.loading;
    },
    tokens(text) {
      const name = this.packName();
      if (!name || !window.VOICE_PACKS || !VOICE_PACKS[name]) return null;
      const keys = VOICE_PACKS[name].clips, out = [];
      const segs = text.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
      for (let si = 0; si < segs.length; si++) {
        const w = segs[si].split(/\s+/);
        let i = 0;
        while (i < w.length) {
          let hit = 0;
          for (let n = Math.min(3, w.length - i); n >= 1; n--) if (keys[w.slice(i, i + n).join(' ')] != null) { hit = n; break; }
          if (!hit) return null;
          out.push({ key: w.slice(i, i + hit).join(' ') }); i += hit;
        }
        if (si < segs.length - 1) out.push({ pause: 0.13 });
      }
      return out;
    },
    rate() { return { '1': 1, '1.15': 1.07, '1.3': 1.15 }[S.rate] || 1.07; },
    duration(text) {
      const t = this.tokens(text), name = this.packName();
      if (!t) return null;
      const d = VOICE_PACKS[name].dur;
      return t.reduce((a, x) => a + (x.pause || (d[x.key] || 0.5) / this.rate() + 0.04), 0);
    },
    stop() { this.active.forEach((s) => { try { s.stop(); } catch (e) {} }); this.active = []; },
    play(text, onend) {
      const t = this.tokens(text);
      if (!t || !this.ctx || this.pack !== this.packName() || t.some((x) => x.key && !this.buffers[x.key])) return null;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.stop();
      const r = this.rate();
      let at = this.ctx.currentTime + 0.05, last = null;
      for (const x of t) {
        if (x.pause) { at += x.pause; continue; }
        const src = this.ctx.createBufferSource();
        src.buffer = this.buffers[x.key]; src.playbackRate.value = r;
        src.connect(this.ctx.destination); src.start(at);
        at += src.buffer.duration / r + 0.04;
        this.active.push(src); last = src;
      }
      if (last) last.onended = onend;
      return at - this.ctx.currentTime;
    },
  };
  function bestDeviceVoice() {
    const vs = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter((v) => /^en/i.test(v.lang));
    const score = (v) => (/premium/i.test(v.name) ? 50 : 0) + (/enhanced|neural|natural/i.test(v.name) ? 40 : 0) + (/google/i.test(v.name) ? 20 : 0) + (/siri/i.test(v.name) ? 15 : 0) + (/en-(us|gb)/i.test(v.lang) ? 5 : 0);
    return vs.sort((a, b) => score(b) - score(a))[0] || null;
  }
  let muted = false, speaking = false, speakTimer = null;
  function speechDur(text) { const d = Clip.duration(text); if (d != null) return d; return 0.3 + (text.split(/[\s,]+/).filter(Boolean).length * 0.34) / (+S.rate || 1.15); }
  function holdFor(text) { speaking = true; clearTimeout(speakTimer); speakTimer = setTimeout(() => { speaking = false; }, speechDur(text) * 1000); }
  function speak(text, force) {
    (window.__spokenLog = window.__spokenLog || []).push([Math.round(now()), text]);
    if ((S.codriver || muted) && !force) return holdFor(text);
    const done = () => { speaking = false; clearTimeout(speakTimer); };
    const dur = Clip.play(text, done);
    if (dur != null) { speaking = true; clearTimeout(speakTimer); speakTimer = setTimeout(done, dur * 1000 + 1500); return; }
    if (!window.speechSynthesis) return holdFor(text);
    const u = new SpeechSynthesisUtterance(text);
    const v = speechSynthesis.getVoices().find((x) => x.name === S.voice) || bestDeviceVoice();
    if (v) u.voice = v;
    u.rate = +S.rate || 1.15; u.lang = (v && v.lang) || 'en-US';
    speaking = true;
    u.onend = done; u.onerror = done;
    clearTimeout(speakTimer); speakTimer = setTimeout(done, speechDur(text) * 1000 + 2500);
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  // =====================================================================
  // Drive
  // =====================================================================
  const LEAD = { early: 5, standard: 3.5, late: 2.5 };
  const DMIN = 35;
  let D = null, wakeLock = null;
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const carIcon = L.divIcon({ className: 'car-icon', iconSize: [36, 36], iconAnchor: [18, 18],
    html: '<div><svg viewBox="0 0 36 36"><path d="M18 3 L30 31 L18 25 L6 31 Z" fill="#ffb020" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg></div>' });

  // panel minimize / expand
  function applyPanel() { $('rallyPanel').classList.toggle('min', S.panel === 'min'); }
  $('panelToggle').onclick = () => { S.panel = S.panel === 'min' ? 'expanded' : 'min'; save(); applyPanel(); };
  applyPanel();

  function matchFix(x, y, heading, v) {
    const s = route.prep.samples, n = s.length;
    let lo = 0, hi = n - 2;
    if (D.locked) { lo = Math.max(0, D.idx - 20); hi = Math.min(n - 2, D.idx + Math.ceil((150 + v * 5) / E.STEP)); }
    let best = null;
    for (let j = lo; j <= hi; j++) {
      const a = s[j], b = s[j + 1];
      const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
      let u = ((x - a.x) * dx + (y - a.y) * dy) / L2; u = Math.max(0, Math.min(1, u));
      const d = Math.hypot(a.x + u * dx - x, a.y + u * dy - y);
      if (best && d >= best.d) continue;
      if (heading != null && v > 3 && Math.abs(wrap(a.h - heading)) > 1.05) continue;
      best = { d, j, s: a.s + u * (b.s - a.s) };
    }
    return best;
  }

  function onFix(f) {
    if (!D) return;
    const p = route.prep.proj.fwd(f.lat, f.lon);
    let v = f.speed, heading = f.heading;
    if (D.lastFix) {
      const dt = (f.t - D.lastFix.t) / 1000, dd = Math.hypot(p.x - D.lastFix.x, p.y - D.lastFix.y);
      if (v == null && dt > 0) v = dd / dt;
      if (heading == null && dd > 4) heading = Math.atan2(p.x - D.lastFix.x, p.y - D.lastFix.y);
    }
    v = Math.min(70, Math.max(0, v || 0));
    D.lastFix = { x: p.x, y: p.y, t: f.t };
    D.lastFixWall = now(); D.v = v; D.acc = f.acc;
    if (D.gpsLost) { D.gpsLost = false; announce('GPS back'); }
    if (f.acc > 35 && now() - (D.weakAt || -1e9) > 60000) { D.weakAt = now(); announce('GPS weak'); }
    const m = matchFix(p.x, p.y, heading, v);
    const tol = Math.max(40, Math.min(80, (f.acc || 10) * 1.5));
    if (m && m.d < tol) {
      let drV = v;
      if (D.locked && D.prevMatchT != null && f.speed == null) { const dt = (f.t - D.prevMatchT) / 1000; if (dt > 0) drV = Math.max(0, (m.s - D.fixS) / dt); }
      D.drV = Math.min(drV, 70);
      D.locked = true; D.idx = m.j; D.fixS = m.s; D.fixT = now(); D.off = 0; D.prevMatchT = f.t;
      if (heading == null && v > 2) heading = route.prep.samples[m.j].h;
    } else {
      D.drV = 0; D.fixT = now(); D.off++;
      if (D.off >= 3 && (f.acc || 99) < 50 && now() - (D.rerouteAt || -1e9) > 20000) reroute(f);
    }
    // car marker + camera
    const ll = [f.lat, f.lon];
    D.car.setLatLng(ll);
    if (heading != null) {
      // accumulate rotation so crossing north never spins the arrow the long way round
      const deg = (heading * 180) / Math.PI;
      if (D.rot == null) D.rot = deg;
      else D.rot += ((((deg - D.rot) % 360) + 540) % 360) - 180;
      const el = D.car.getElement(); if (el) el.firstChild.style.transform = `rotate(${D.rot}deg)`;
    }
    if (D.follow) {
      const z = v > 25 ? 15 : v > 13 ? 16 : 17;
      D.programmatic = true;
      map.setView(ll, D.userZoom || z, { animate: true, duration: 0.8 });
    }
    // HUD
    $('speed').textContent = fmtSpeed(v);
    const lim = route.limits && route.limits[D.idx];
    $('limit').classList.toggle('hidden', !lim);
    $('limit').classList.toggle('us', imp());
    if (lim) $('limit').textContent = fmtLimit(lim);
    $('speedBox').classList.toggle('over', !!lim && v * 3.6 > lim + 8);
    $('gps').textContent = `GPS ±${Math.round(f.acc || 0)} m` + (D.locked ? '' : ' · finding route');
    updateTraveled();
  }

  function updateTraveled() {
    if (!D.locked || Math.abs(D.idx - (D.travIdx || 0)) < 8) return;
    D.travIdx = D.idx;
    const s = route.prep.samples, pts = [];
    for (let i = 0; i <= D.idx; i += 3) pts.push([s[i].lat, s[i].lon]);
    if (!traveledLine) traveledLine = L.polyline(pts, { color: '#5b6573', weight: 7, opacity: 1 }).addTo(map);
    else traveledLine.setLatLngs(pts);
  }

  function announce(text) { if (D) D.sysQueue.push(text); }

  async function reroute(f) {
    D.rerouteAt = now();
    announce('off route, rerouting');
    try {
      const raw = await SV.routes({ lat: f.lat, lon: f.lon }, route.to, { avoidHighways: S.avoidHighways, avoidTolls: S.avoidTolls, alternates: 0 });
      if (!D) return;
      const r = raw[0], prep = E.prepare(r.latlngs);
      const quick = E.build(prep, { steps: r.steps });
      const swap = (notes, limits) => {
        route = { ...route, prep, notes, limits, latlngs: r.latlngs, duration: r.duration, maneuvers: r.maneuvers, source: r.source };
        D.locked = false; D.idx = 0; D.fixS = 0; D.ptr = 0; D.off = 0; D.prevMatchT = null; D.drV = 0; D.travIdx = 0;
        D.spoken = new Set();
        if (routeLine) routeLine.setLatLngs(r.latlngs);
        if (traveledLine) { traveledLine.remove(); traveledLine = null; }
        altLines.forEach((l) => l.remove()); altLines = [];
        markerLayer.clearLayers();
      };
      swap(quick.notes, quick.limits);
      announce('route updated');
      // add hazards/limits in the background, without repeating calls already made
      const o = { prep, steps: r.steps, full: null };
      fullBuild(o).then((full) => {
        if (!D || route.prep !== prep) return;
        const sNow = D.sEst || 0;
        route.notes = full.notes; route.limits = full.limits;
        D.spoken = new Set(full.notes.filter((n) => n.s < sNow + 150).map((n) => n.id));
        D.ptr = 0;
      }).catch(() => {});
    } catch (e) { announce('reroute failed'); }
  }

  function tick() {
    if (!D) return;
    const t = now();
    if (D.lastFixWall && t - D.lastFixWall > 8000 && !D.gpsLost && !D.sim) { D.gpsLost = true; announce('GPS lost'); $('gps').textContent = 'GPS lost'; }
    const vr = D.drV || 0;
    const sEst = D.locked ? D.fixS + Math.min((vr * (t - D.fixT)) / 1000, vr * 2) : -1;
    D.sEst = sEst;
    const notes = route.notes, o = noteOpts();
    if (!speaking && D.sysQueue.length) { speak(D.sysQueue.shift()); return; }
    if (!D.locked) return;
    while (D.ptr < notes.length && (D.spoken.has(notes[D.ptr].id) || !E.noteVisible(notes[D.ptr], o) || notes[D.ptr].s < sEst - 5)) D.ptr++;
    renderHud(sEst);
    if (speaking || D.ptr >= notes.length) return;
    const n = notes[D.ptr];
    const ph = E.phrase(notes, D.ptr, o);
    const trig = Math.max(DMIN, vr * (LEAD[S.timing] + speechDur(ph.text)));
    if (n.s - sEst <= trig) {
      ph.used.forEach((id) => D.spoken.add(id));
      showCall(ph.text);
      speak(ph.text);
      if (n.kind === 'finish') setTimeout(() => { if (D) { stopDrive(); status('Arrived. Nice drive.'); } }, 5000);
    }
  }

  function showCall(text) {
    const m = /^(.*), (\d+)$/.exec(text);
    $('callMain').textContent = (m ? m[1] : text).replace(/,/g, '');
    $('callDist').textContent = m ? m[2] + (imp() ? ' ft' : ' m') : '';
    const el = $('call'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    if (S.codriver && navigator.vibrate) navigator.vibrate(/hard|hairpin| 1| 2/.test(text) ? [120, 60, 120] : 80);
  }

  // turn arrows for the navigation banner
  function arrowSvg(type, mod) {
    const p = (d) => `<svg viewBox="0 0 48 48"><path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (type === 'arrive') return '<svg viewBox="0 0 48 48"><path d="M14 42V6M14 8h22l-5 7 5 7H14" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>';
    if (/roundabout|rotary/.test(type)) return p('M24 44V30M24 30a8 8 0 1 1 8-8M32 22l6-6M38 16h-7M38 16v7');
    if (mod === 'uturn') return p('M16 44V18a8 8 0 0 1 16 0v14M26 26l6 6 6-6');
    const right = /right/.test(mod), slight = /slight/.test(mod), sharp = /sharp/.test(mod);
    if (!/left|right/.test(mod)) return p('M24 44V6M14 16l10-10 10 10');
    const d = slight ? (right ? 'M18 44V24L34 8M24 8h10v10' : 'M30 44V24L14 8M24 8H14v10')
      : sharp ? (right ? 'M16 44V12l20 20M36 22v10H26' : 'M32 44V12L12 32M12 22v10h10')
      : (right ? 'M16 44V22h24M32 14l8 8-8 8' : 'M32 44V22H8M16 14l-8 8 8 8');
    return p(d);
  }

  function renderHud(sEst) {
    if (now() - (D.hudAt || 0) < 400) return;
    D.hudAt = now();
    const o = noteOpts(), out = [];
    for (let k = D.ptr; k < route.notes.length && out.length < 3; k++) {
      const n = route.notes[k];
      if (!E.noteVisible(n, o) || D.spoken.has(n.id)) continue;
      out.push(`<div><span>${fmtDist(Math.max(0, n.s - sEst))}</span><b>${esc(E.noteWords(n, o))}</b></div>`);
    }
    $('next').innerHTML = out.join('');
    $('remain').textContent = fmtDist(Math.max(0, route.prep.length - sEst)) + ' left';
    // next turn-by-turn maneuver
    const mv = (route.maneuvers || []).find((m) => m.s > sEst + 5 && m.type !== 'depart');
    const nb = $('navBanner');
    if (!mv) { nb.classList.add('empty'); return; }
    nb.classList.remove('empty');
    const key = mv.type + mv.modifier;
    if (D.arrowKey !== key) { $('navArrow').innerHTML = arrowSvg(mv.type, mv.modifier); D.arrowKey = key; }
    $('navDist').textContent = fmtDist(Math.max(0, mv.s - sEst));
    $('navText').textContent = mv.text || mv.street || '';
  }

  async function keepAwake() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (D && document.visibilityState === 'visible') keepAwake(); });

  // user drags the map -> stop following; user pinch-zooms -> keep their zoom
  map.on('dragstart', () => { if (!D) return; D.follow = false; $('btnRecenter').classList.remove('hidden'); });
  map.on('zoomend', () => { if (D && !D.programmatic) D.userZoom = map.getZoom(); });
  map.on('moveend', () => { if (D) D.programmatic = false; });
  $('btnRecenter').onclick = () => { if (!D) return; D.follow = true; D.userZoom = null; $('btnRecenter').classList.add('hidden'); if (D.car) map.setView(D.car.getLatLng(), 16); };

  function startDrive(sim) {
    if (!route) return;
    Clip.unlock();
    if (!Clip.packName() && window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    Clip.load().then(() => speak(sim ? 'simulation, co-driver ready' : 'co-driver ready', true));
    stopLocate();
    D = { sim, locked: false, idx: 0, fixS: 0, fixT: 0, v: 0, ptr: 0, spoken: new Set(), off: 0, sysQueue: [], follow: true };
    document.body.classList.add('driving');
    $('driveHud').classList.remove('hidden');
    $('btnRecenter').classList.add('hidden');
    $('driveMode').textContent = sim ? 'SIMULATION' : S.codriver ? 'CO-DRIVER MODE' : 'DRIVE';
    $('callMain').textContent = 'READY'; $('callDist').textContent = '';
    $('speedunit').textContent = imp() ? 'mph' : 'km/h';
    altLines.forEach((l) => l.remove()); altLines = [];
    D.car = L.marker(route.latlngs[0], { icon: carIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
    map.setView(route.latlngs[0], 16);
    keepAwake();
    D.tickTimer = setInterval(tick, 200);
    if (sim) startSim();
    else if (navigator.geolocation) {
      D.watch = navigator.geolocation.watchPosition(
        (p) => onFix({ lat: p.coords.latitude, lon: p.coords.longitude, speed: p.coords.speed,
          heading: p.coords.heading == null || isNaN(p.coords.heading) || (p.coords.speed || 0) < 2 ? null : (p.coords.heading * Math.PI) / 180,
          acc: p.coords.accuracy, t: p.timestamp || Date.now() }),
        (err) => { $('gps').textContent = 'GPS error: ' + err.message; },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    } else $('gps').textContent = 'No GPS in this browser';
  }

  function stopDrive() {
    if (!D) return;
    clearInterval(D.tickTimer); clearInterval(D.simTimer);
    if (D.watch != null) navigator.geolocation.clearWatch(D.watch);
    if (D.car) D.car.remove();
    D = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    Clip.stop(); speaking = false;
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
    if (traveledLine) { traveledLine.remove(); traveledLine = null; }
    document.body.classList.remove('driving');
    $('driveHud').classList.add('hidden');
    if (options.length) drawRoutes();
    renderPreview();
  }

  // ---------- simulator: drives the route at a chosen speed, braking for corners ----------
  const CORNER_KMH = [0, 28, 42, 58, 76, 96, 120];
  function startSim() {
    const target = +$('simSpeed').value / 3.6;
    let s = 0, v = 0, t = Date.now();
    const samples = route.prep.samples, L0 = route.prep.length;
    D.simTimer = setInterval(() => {
      if (!D) return;
      let allowed = target;
      for (const n of route.notes) {
        if (n.s > s + 400) break;
        let vc = null;
        if (n.kind === 'corner') vc = (n.hairpin ? 22 : CORNER_KMH[n.grade]) / 3.6;
        else if (n.kind === 'roundabout') vc = 25 / 3.6;
        else if (n.kind === 'junction' || n.kind === 'keep') vc = 30 / 3.6;
        if (vc == null) continue;
        const end = n.sEnd || n.s + 10;
        if (s >= n.s - 5 && s <= end) allowed = Math.min(allowed, vc);
        else if (n.s > s) allowed = Math.min(allowed, Math.sqrt(vc * vc + 2 * 3.5 * (n.s - s)));
      }
      v = allowed > v ? Math.min(allowed, v + 2.5) : Math.max(allowed, v - 6);
      s = Math.min(L0, s + v);
      t += 1000;
      const p = samples[Math.min(samples.length - 1, Math.round(s / E.STEP))];
      onFix({ lat: p.lat, lon: p.lon, speed: v, heading: v > 2 ? p.h : null, acc: 5, t });
      if (s >= L0) clearInterval(D.simTimer);
    }, 1000);
  }

  $('btnDrive').onclick = () => startDrive(false);
  $('btnSim').onclick = () => startDrive(true);
  $('btnStop').onclick = () => stopDrive();
  $('btnMute').onclick = () => {
    muted = !muted;
    $('btnMute').classList.toggle('on', muted);
    $('btnMute').textContent = muted ? 'MUTED' : 'MUTE';
    if (muted) { if (window.speechSynthesis) speechSynthesis.cancel(); Clip.stop(); }
  };

  window.__rally = { get route() { return route; }, get drive() { return D; }, get options() { return options; }, onFix, setPoint, planRoute };
})();
