// Free, keyless map services.
//   Routing:  Valhalla (FOSSGIS public server, the engine behind openstreetmap.org directions), OSRM fallback
//   Search:   Photon (komoot, search-as-you-type), Nominatim fallback
//   Features: Overpass API (OpenStreetMap tags: bumps, bridges, surfaces, speed limits...)
//   Elevation: Open-Meteo
(function (root) {
  'use strict';

  async function fetchJSON(url, init, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 30000);
    try {
      const r = await fetch(url, { ...(init || {}), signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  // ---------- search ----------
  function photonLabel(p) {
    const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || '';
    const line1 = p.housenumber && p.street && p.name ? `${p.name}` : name;
    const sub = [p.housenumber && p.street && !p.name ? null : [p.housenumber, p.street].filter(Boolean).join(' '), p.city || p.town || p.village, p.state, p.country].filter(Boolean);
    return { label: line1, sub: [...new Set(sub)].filter((x) => x && x !== line1).join(', ') };
  }

  async function search(q, near) {
    q = q.trim();
    if (q.length < 2) return [];
    try {
      let url = 'https://photon.komoot.io/api/?limit=6&lang=en&q=' + encodeURIComponent(q);
      if (near) url += `&lat=${near.lat.toFixed(4)}&lon=${near.lon.toFixed(4)}`;
      const j = await fetchJSON(url, null, 10000);
      const out = (j.features || []).map((f) => ({ ...photonLabel(f.properties), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }));
      if (out.length) return out;
    } catch (e) { /* fall through */ }
    const j = await fetchJSON('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=' + encodeURIComponent(q), null, 12000);
    return j.map((r) => ({ label: r.display_name.split(',')[0], sub: r.display_name.split(',').slice(1, 4).join(',').trim(), lat: +r.lat, lon: +r.lon }));
  }

  // ---------- routing ----------
  function decodePolyline(str, precision) {
    const f = Math.pow(10, precision || 6);
    let i = 0, lat = 0, lon = 0;
    const out = [];
    while (i < str.length) {
      let b, shift = 0, res = 0;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += res & 1 ? ~(res >> 1) : res >> 1;
      shift = 0; res = 0;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lon += res & 1 ? ~(res >> 1) : res >> 1;
      out.push([lat / f, lon / f]);
    }
    return out;
  }

  // Valhalla maneuver type -> OSRM-like step (what the pace-note engine understands)
  const VH = {
    1: ['depart', ''], 2: ['depart', 'right'], 3: ['depart', 'left'], 4: ['arrive', ''], 5: ['arrive', 'right'], 6: ['arrive', 'left'],
    7: ['new name', 'straight'], 8: ['continue', 'straight'], 9: ['turn', 'slight right'], 10: ['turn', 'right'], 11: ['turn', 'sharp right'],
    12: ['turn', 'uturn'], 13: ['turn', 'uturn'], 14: ['turn', 'sharp left'], 15: ['turn', 'left'], 16: ['turn', 'slight left'],
    17: ['on ramp', 'straight'], 18: ['on ramp', 'right'], 19: ['on ramp', 'left'], 20: ['fork', 'right'], 21: ['fork', 'left'],
    22: ['fork', 'straight'], 23: ['fork', 'right'], 24: ['fork', 'left'], 25: ['merge', 'straight'], 26: ['roundabout', ''],
    27: ['exit roundabout', ''], 28: ['notification', ''], 29: ['notification', ''], 37: ['merge', 'right'], 38: ['merge', 'left'],
  };

  function fromValhalla(trip) {
    const leg = trip.legs[0];
    const latlngs = decodePolyline(leg.shape, 6);
    const steps = [], maneuvers = [];
    let s = 0;
    for (const m of leg.maneuvers) {
      const [type, modifier] = VH[m.type] || ['continue', 'straight'];
      const name = (m.street_names && m.street_names[0]) || '';
      steps.push({ distance: m.length * 1000, name, maneuver: { type, modifier, exit: m.roundabout_exit_count || undefined } });
      maneuvers.push({ s, type, modifier, exit: m.roundabout_exit_count, text: m.instruction || '', street: name });
      s += m.length * 1000;
    }
    return { latlngs, steps, maneuvers, duration: trip.summary.time, distance: trip.summary.length * 1000, source: 'Valhalla' };
  }

  function osrmText(type, mod, name, exit) {
    const onto = name ? ' onto ' + name : '';
    if (type === 'depart') return 'Head out' + onto;
    if (type === 'arrive') return 'Arrive at destination';
    if (type === 'roundabout' || type === 'rotary') return `At the roundabout, take exit ${exit || ''}`.trim() + onto;
    if (type === 'fork') return `Keep ${mod.replace('slight ', '')}` + onto;
    if (/ramp/.test(type)) return 'Take the ramp' + onto;
    if (mod === 'straight') return 'Continue' + onto;
    if (mod === 'uturn') return 'Make a U-turn';
    return `Turn ${mod}` + onto;
  }

  function fromOSRM(r) {
    const latlngs = r.geometry.coordinates.map((c) => [c[1], c[0]]);
    const steps = r.legs.flatMap((l) => l.steps);
    let s = 0;
    const maneuvers = steps.map((st) => {
      const m = { s, type: st.maneuver.type, modifier: st.maneuver.modifier || '', exit: st.maneuver.exit, street: st.name || '', text: osrmText(st.maneuver.type, st.maneuver.modifier || '', st.name, st.maneuver.exit) };
      s += st.distance;
      return m;
    });
    return { latlngs, steps, maneuvers, duration: r.duration, distance: r.distance, source: 'OSRM' };
  }

  let lastRouteCall = 0;
  async function politeWait() { // FOSSGIS routing servers: max 1 request per second
    const wait = lastRouteCall + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRouteCall = Date.now();
  }

  async function routes(from, to, prefs) {
    prefs = prefs || {};
    try {
      await politeWait();
      const req = {
        locations: [{ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon }],
        costing: 'auto',
        costing_options: { auto: { use_highways: prefs.avoidHighways ? 0 : 1, use_tolls: prefs.avoidTolls ? 0 : 1 } },
        units: 'kilometers',
        directions_options: { units: 'kilometers', language: 'en-US' },
        alternates: prefs.alternates == null ? 2 : prefs.alternates,
      };
      const j = await fetchJSON('https://valhalla1.openstreetmap.de/route?json=' + encodeURIComponent(JSON.stringify(req)), null, 30000);
      const out = [fromValhalla(j.trip)];
      for (const a of j.alternates || []) out.push(fromValhalla(a.trip));
      return out;
    } catch (e) {
      await politeWait();
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=true&alternatives=${prefs.alternates === 0 ? 'false' : 'true'}`;
      const j = await fetchJSON(url, null, 30000);
      if (!j.routes || !j.routes.length) throw new Error('No route found between those points.');
      return j.routes.map(fromOSRM);
    }
  }

  // ---------- road features ----------
  function simplify(pts, tol) {
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let idx = -1, dm = tol;
      const A = pts[a], B = pts[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs(dy * pts[i].x - dx * pts[i].y + B.x * A.y - B.y * A.x) / L;
        if (d > dm) { dm = d; idx = i; }
      }
      if (idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }

  // Query small bounding boxes along the route (~1 km each): much faster on the public servers
  // than a corridor search. Ways that merely cross or run near the route are filtered out later.
  async function roadFeatures(samples) {
    const CH = 200; // samples per box (5 m spacing -> 1 km)
    let step = CH;
    while (samples.length / step > 120) step *= 2; // cap the number of boxes on long routes
    const boxes = [];
    for (let i = 0; i < samples.length; i += step) {
      let a = 90, b = 180, c = -90, d = -180;
      for (let k = i; k < Math.min(samples.length, i + step + 1); k++) {
        const p = samples[k];
        if (p.lat < a) a = p.lat; if (p.lon < b) b = p.lon; if (p.lat > c) c = p.lat; if (p.lon > d) d = p.lon;
      }
      boxes.push([(a - 0.0003).toFixed(5), (b - 0.0004).toFixed(5), (c + 0.0003).toFixed(5), (d + 0.0004).toFixed(5)].join(','));
    }
    const hw = '^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|road|service|track|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$';
    const q = '[out:json][timeout:60];(' + boxes.map((bb) =>
      `way[highway~"${hw}"](${bb});node[traffic_calming](${bb});node[highway=speed_camera](${bb});node[railway=level_crossing](${bb});`).join('') + ');out geom qt;';
    const hosts = [
      ['https://overpass-api.de/api/interpreter', 40000],
      ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 60000],
      ['https://overpass.kumi.systems/api/interpreter', 60000],
    ];
    let lastErr;
    for (const [h, ms] of hosts) {
      try {
        const j = await fetchJSON(h, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, ms);
        if (j && j.elements) return j;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Overpass unavailable');
  }

  // Open-Meteo elevation (90 m terrain model): one request at a time, retry when rate-limited.
  async function elevation(samples) {
    let every = 8; // every 40 m
    while (samples.length / every > 1500) every *= 2;
    const idx = [];
    for (let i = 0; i < samples.length; i += every) idx.push(i);
    const out = [];
    for (let k = 0; k < idx.length; k += 100) {
      const ids = idx.slice(k, k + 100);
      const url = 'https://api.open-meteo.com/v1/elevation?latitude=' + ids.map((i) => samples[i].lat.toFixed(5)).join(',') + '&longitude=' + ids.map((i) => samples[i].lon.toFixed(5)).join(',');
      let r = null;
      for (let attempt = 0; attempt < 3 && !r; attempt++) {
        try { r = await fetchJSON(url, null, 20000); }
        catch (e) { if (attempt === 2) throw e; await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); }
      }
      r.elevation.forEach((z, j) => out.push({ i: ids[j], z }));
      await new Promise((res) => setTimeout(res, 250));
    }
    return out;
  }

  root.Services = { search, routes, roadFeatures, elevation, decodePolyline };
})(window);
