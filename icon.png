// Pace-note engine: route geometry + map data -> rally-style notes.
// Pure functions, no DOM. Works in browser (window.Engine) and node (module.exports).
(function (root) {
  const RE = 6371008.8;
  const D2R = Math.PI / 180;
  const STEP = 5; // resample spacing, meters

  // ---------- geometry ----------
  function makeProjection(latlngs) {
    let s = 0;
    for (const p of latlngs) s += p[0];
    const lat0 = s / latlngs.length;
    const k = Math.cos(lat0 * D2R);
    return {
      fwd: (lat, lon) => ({ x: lon * D2R * RE * k, y: lat * D2R * RE }),
      inv: (x, y) => [y / RE / D2R, x / (RE * k) / D2R],
    };
  }

  function resample(pts, step) {
    const out = [{ x: pts[0].x, y: pts[0].y }];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const L = Math.hypot(dx, dy);
      if (L === 0) continue;
      let d = step - carry;
      while (d <= L) {
        out.push({ x: a.x + (dx * d) / L, y: a.y + (dy * d) / L });
        d += step;
      }
      carry = L - (d - step);
    }
    const last = pts[pts.length - 1];
    const tail = out[out.length - 1];
    if (Math.hypot(last.x - tail.x, last.y - tail.y) > 0.5) out.push({ x: last.x, y: last.y });
    return out;
  }

  function smooth(pts, w) {
    const n = pts.length;
    return pts.map((p, i) => {
      if (i < w || i >= n - w) return { x: p.x, y: p.y };
      let sx = 0, sy = 0;
      for (let j = -w; j <= w; j++) { sx += pts[i + j].x; sy += pts[i + j].y; }
      return { x: sx / (2 * w + 1), y: sy / (2 * w + 1) };
    });
  }

  function wrap(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  // signed Menger curvature, + = left turn (x east, y north)
  function curvatures(pts, k) {
    const n = pts.length;
    const kap = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - k)], b = pts[i], c = pts[Math.min(n - 1, i + k)];
      const abx = b.x - a.x, aby = b.y - a.y, bcx = c.x - b.x, bcy = c.y - b.y;
      const cross = abx * bcy - aby * bcx;
      const d = Math.hypot(abx, aby) * Math.hypot(bcx, bcy) * Math.hypot(c.x - a.x, c.y - a.y);
      kap[i] = d > 1e-6 ? (2 * cross) / d : 0;
    }
    // light smoothing of the curvature signal
    return kap.map((v, i) => {
      if (i === 0 || i === n - 1) return v;
      return (kap[i - 1] + 2 * v + kap[i + 1]) / 4;
    });
  }

  // ---------- grading ----------
  // Radius cutoffs = the rally speed bands (1: <40 km/h, 2: 40-60, 3: 60-80, 4: 80-110, 5: 110-140, 6: 140+)
  // at ~0.8 g of cornering grip: R = v^2 / a
  const R_BINS = [16, 35, 63, 119, 193, 400]; // grade 1..6 upper radius (m)
  const R_MID = [12, 25, 48, 90, 155, 300];
  function gradeFromRadius(r) {
    for (let g = 0; g < R_BINS.length; g++) if (r < R_BINS[g]) return g + 1;
    return 7; // too gentle to call
  }

  function findCorners(samples, kap, opts) {
    const KMIN = 1 / 400, KHOLD = KMIN * 0.7;
    const n = samples.length;
    const runs = [];
    let i = 0;
    while (i < n) {
      if (Math.abs(kap[i]) >= KMIN) {
        const dir = Math.sign(kap[i]);
        let j = i;
        while (j + 1 < n && Math.sign(kap[j + 1]) === dir && Math.abs(kap[j + 1]) >= KHOLD) j++;
        runs.push({ a: i, b: j, dir });
        i = j + 1;
      } else i++;
    }
    // merge same-direction runs separated by small gaps
    const merged = [];
    for (const r of runs) {
      const prev = merged[merged.length - 1];
      if (prev && prev.dir === r.dir && r.a - prev.b <= 3) prev.b = r.b;
      else merged.push({ ...r });
    }
    const corners = [];
    for (const r of merged) {
      let dTheta = 0;
      for (let j = Math.max(1, r.a); j <= Math.min(n - 1, r.b + 1); j++) dTheta += wrap(samples[j].h - samples[j - 1].h);
      dTheta = Math.abs(dTheta) / D2R;
      if (dTheta < 12) continue;
      let kmax = 0;
      for (let j = r.a; j <= r.b; j++) kmax = Math.max(kmax, Math.abs(kap[j]));
      const minR = 1 / kmax;
      let grade = gradeFromRadius(minR);
      if (dTheta < 30) grade += 2;
      else if (dTheta < 60) grade += 1;
      if (grade >= 7) continue;
      if (grade === 6 && dTheta < 20) continue;
      const hairpin = dTheta >= 135 && minR < 25;
      if (hairpin) grade = 1;
      const len = (r.b - r.a + 1) * STEP;
      // shape: entry vs exit radius
      const third = Math.max(1, Math.floor((r.b - r.a + 1) / 3));
      let kIn = 0, kOut = 0;
      for (let j = r.a; j < r.a + third; j++) kIn = Math.max(kIn, Math.abs(kap[j]));
      for (let j = r.b - third + 1; j <= r.b; j++) kOut = Math.max(kOut, Math.abs(kap[j]));
      const rIn = 1 / Math.max(kIn, 1e-9), rOut = 1 / Math.max(kOut, 1e-9);
      let shape = null;
      if (len >= 40 && !hairpin) {
        // only call a change of character when it is big: radius halves and the grade moves
        if (rOut < 0.5 * rIn && gradeFromRadius(rOut) < gradeFromRadius(rIn)) shape = 'tightens';
        else if (rIn < 0.45 * rOut && gradeFromRadius(rIn) <= gradeFromRadius(rOut) - 2) shape = 'opens';
      }
      const arc90 = (R_MID[grade - 1] * Math.PI) / 2;
      const long = !hairpin && len > 100 && len > 2.2 * arc90;
      corners.push({
        kind: 'corner', s: samples[r.a].s, sEnd: samples[r.b].s, i0: r.a, i1: r.b,
        dir: r.dir > 0 ? 'left' : 'right', grade, hairpin, shape, long,
        minR: Math.round(minR), dTheta: Math.round(dTheta), len,
      });
    }
    return corners;
  }

  // ---------- map-data matching ----------
  function buildGrid(samples, cell) {
    const g = new Map();
    samples.forEach((p, i) => {
      const key = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell);
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(i);
    });
    return {
      near(x, y, r) {
        const out = [];
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), span = Math.ceil(r / cell);
        for (let a = -span; a <= span; a++)
          for (let b = -span; b <= span; b++) {
            const l = g.get(cx + a + ',' + (cy + b));
            if (l) out.push(...l);
          }
        return out;
      },
    };
  }

  function nearestSample(samples, grid, x, y, r) {
    let best = -1, bd = r;
    for (const i of grid.near(x, y, r)) {
      const d = Math.hypot(samples[i].x - x, samples[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  const UNPAVED = new Set(['unpaved', 'gravel', 'fine_gravel', 'dirt', 'earth', 'ground', 'compacted', 'sand', 'grass', 'mud', 'pebblestone', 'rock', 'woodchips']);
  const COBBLE = new Set(['sett', 'cobblestone', 'unhewn_cobblestone', 'paving_stones']);

  // Assign each route sample to an OSM way running alongside it (same direction).
  function matchWays(samples, grid, proj, ways) {
    const assigned = new Array(samples.length).fill(null);
    const bestD = new Array(samples.length).fill(12);
    for (const w of ways) {
      if (!w.geometry || w.geometry.length < 2) continue;
      const g = w.geometry.map((p) => proj.fwd(p.lat, p.lon));
      for (let j = 1; j < g.length; j++) {
        const a = g[j - 1], b = g[j];
        const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
        if (L2 === 0) continue;
        const segH = Math.atan2(dx, dy);
        const L = Math.sqrt(L2);
        const steps = Math.max(1, Math.ceil(L / 20));
        const seen = new Set();
        for (let t = 0; t <= steps; t++) {
          const px = a.x + (dx * t) / steps, py = a.y + (dy * t) / steps;
          for (const i of grid.near(px, py, 25)) seen.add(i);
        }
        for (const i of seen) {
          const p = samples[i];
          let u = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
          u = Math.max(0, Math.min(1, u));
          const d = Math.hypot(a.x + u * dx - p.x, a.y + u * dy - p.y);
          if (d >= bestD[i]) continue;
          const dh = Math.abs(wrap(segH - p.h));
          if (dh > 0.6 && dh < Math.PI - 0.6) continue; // crossing road, not ours
          bestD[i] = d;
          assigned[i] = w.tags || {};
        }
      }
    }
    return assigned;
  }

  // Runs of samples where pred(tags) holds, at least minLen meters long.
  function runsWhere(samples, assigned, pred, minLen) {
    const out = [];
    let start = -1, gap = 0;
    for (let i = 0; i <= samples.length; i++) {
      const on = i < samples.length && assigned[i] && pred(assigned[i]);
      if (on) { if (start < 0) start = i; gap = 0; }
      else if (start >= 0) {
        gap++;
        if (gap > 2 || i === samples.length) {
          const end = i - gap;
          if ((end - start + 1) * STEP >= minLen) out.push({ a: start, b: end });
          start = -1; gap = 0;
        }
      }
    }
    return out;
  }

  // ---------- crests from elevation ----------
  function findCrests(samples, elev, skip) {
    // elev: array of {i, z} at roughly 30 m spacing
    if (!elev || elev.length < 7) return [];
    const z = elev.map((e, k) => {
      const lo = Math.max(0, k - 1), hi = Math.min(elev.length - 1, k + 1);
      let s = 0; for (let j = lo; j <= hi; j++) s += elev[j].z;
      return s / (hi - lo + 1);
    });
    const crests = [];
    for (let k = 2; k < elev.length - 2; k++) {
      if (skip[elev[k].i]) continue;
      const ds1 = samples[elev[k].i].s - samples[elev[k - 2].i].s;
      const ds2 = samples[elev[k + 2].i].s - samples[elev[k].i].s;
      if (ds1 <= 0 || ds2 <= 0) continue;
      const gIn = (z[k] - z[k - 2]) / ds1, gOut = (z[k + 2] - z[k]) / ds2;
      if (z[k] >= z[k - 1] && z[k] >= z[k + 1] && gIn > 0.03 && gOut < -0.03 && gIn - gOut > 0.07) {
        const s = samples[elev[k].i].s;
        if (!crests.length || s - crests[crests.length - 1].s > 80) crests.push({ kind: 'crest', s, i0: elev[k].i });
      }
    }
    return crests;
  }

  // ---------- main ----------
  // input: { latlngs:[[lat,lon]...], steps:[osrm steps], osm:{elements}, elevation:[{i,z}] }
  function prepare(latlngs) {
    const proj = makeProjection(latlngs);
    const raw = latlngs.map(([la, lo]) => proj.fwd(la, lo));
    const rs = resample(raw, STEP);
    const sm = smooth(rs, 2);
    const samples = sm.map((p, i) => ({ x: p.x, y: p.y, s: i * STEP, h: 0 }));
    for (let i = 0; i < samples.length; i++) {
      const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
      samples[i].h = Math.atan2(b.x - a.x, b.y - a.y);
    }
    samples.forEach((p) => { const ll = proj.inv(p.x, p.y); p.lat = ll[0]; p.lon = ll[1]; });
    return { proj, samples, length: samples.length ? samples[samples.length - 1].s : 0 };
  }

  function build(prep, data) {
    const { proj, samples } = prep;
    const kap = curvatures(samples, 3);
    let corners = findCorners(samples, kap);
    const grid = buildGrid(samples, 25);
    const notes = [];
    const els = (data.osm && data.osm.elements) || [];
    const ways = els.filter((e) => e.type === 'way');
    const nodes = els.filter((e) => e.type === 'node');
    const assigned = ways.length ? matchWays(samples, grid, proj, ways) : new Array(samples.length).fill(null);

    // speed limits per sample (km/h)
    const limits = assigned.map((t) => {
      if (!t || !t.maxspeed) return null;
      const m = /^(\d+)\s*(mph)?/.exec(t.maxspeed);
      if (!m) return null;
      return m[2] ? Math.round(+m[1] * 1.609) : +m[1];
    });

    // roundabouts: suppress geometric corners inside, emit one note
    const rbRuns = runsWhere(samples, assigned, (t) => t.junction === 'roundabout' || t.junction === 'circular', 5);
    const steps = data.steps || [];
    let stepS = 0;
    const stepAt = steps.map((st) => { const s = stepS; stepS += st.distance || 0; return { st, s }; });
    const rbSteps = stepAt.filter((x) => /roundabout|rotary/.test(x.st.maneuver.type) && !/exit/.test(x.st.maneuver.type));
    const usedRb = new Set();
    for (const r of rbRuns) {
      const s0 = samples[r.a].s, s1 = samples[r.b].s;
      let exit = null;
      for (let k = 0; k < rbSteps.length; k++) {
        if (Math.abs(rbSteps[k].s - s0) < 60 && !usedRb.has(k)) { exit = rbSteps[k].st.maneuver.exit || null; usedRb.add(k); break; }
      }
      notes.push({ kind: 'roundabout', s: s0, sEnd: s1, exit, i0: r.a });
    }
    // roundabouts OSRM knows about but OSM matching missed
    rbSteps.forEach((x, k) => {
      if (usedRb.has(k)) return;
      notes.push({ kind: 'roundabout', s: x.s, sEnd: x.s + 50, exit: x.st.maneuver.exit || null, i0: Math.round(x.s / STEP) });
    });
    const rbNotes = notes.filter((n) => n.kind === 'roundabout');
    corners = corners.filter((c) => !rbNotes.some((r) => c.sEnd >= r.s - 15 && c.s <= r.sEnd + 15));

    // junction turns from OSRM steps
    for (const { st, s } of stepAt) {
      const t = st.maneuver.type, m = st.maneuver.modifier || '';
      if (/roundabout|rotary|depart|arrive/.test(t)) continue;
      if (!/left|right/.test(m)) continue;
      if ((t === 'new name' || t === 'continue') && /slight/.test(m)) continue;
      const dir = /left/.test(m) ? 'left' : 'right';
      const c = corners.find((c) => s >= c.s - 25 && s <= c.sEnd + 25 && c.dir === dir);
      const kind = t === 'fork' ? 'keep' : 'junction';
      if (c) { c.junction = kind; c.road = st.name || ''; }
      else notes.push({ kind, s: Math.max(0, s - 5), dir, road: st.name || '', i0: Math.round(s / STEP) });
    }

    notes.push(...corners);

    // point hazards
    const TC = { bump: 'bump', hump: 'bump', table: 'bump', cushion: 'bump', rumble_strip: 'rumble strip', dip: 'dip', chicane: 'chicane', choker: 'narrows', island: 'island' };
    const pointHaz = [];
    for (const nd of nodes) {
      const t = nd.tags || {};
      let what = null, r = 15;
      if (t.traffic_calming && TC[t.traffic_calming]) what = TC[t.traffic_calming];
      else if (t.highway === 'speed_camera') { what = 'camera'; r = 30; }
      else if (t.railway === 'level_crossing') what = 'rail crossing';
      if (!what) continue;
      const p = proj.fwd(nd.lat, nd.lon);
      const i = nearestSample(samples, grid, p.x, p.y, r);
      if (i >= 0) pointHaz.push({ kind: 'hazard', what, s: samples[i].s, i0: i });
    }
    pointHaz.sort((a, b) => a.s - b.s);
    for (const h of pointHaz) {
      const prev = notes.find((n) => n.kind === 'hazard' && n.what.startsWith(h.what.replace(/s$/, '')) && h.s - n.s < 60 && h.s >= n.s);
      if (prev && h.what === 'bump') { prev.what = 'bumps'; continue; }
      if (prev) continue;
      notes.push(h);
    }

    // way-based hazards
    const isUnpaved = (t) => t.surface && UNPAVED.has(t.surface);
    const isCobble = (t) => t.surface && COBBLE.has(t.surface);
    for (const r of runsWhere(samples, assigned, (t) => t.bridge && t.bridge !== 'no', 15)) notes.push({ kind: 'hazard', what: 'bridge', s: samples[r.a].s, i0: r.a });
    for (const r of runsWhere(samples, assigned, (t) => t.tunnel && t.tunnel !== 'no', 20)) notes.push({ kind: 'hazard', what: 'tunnel', s: samples[r.a].s, i0: r.a });
    for (const r of runsWhere(samples, assigned, isUnpaved, 40)) {
      notes.push({ kind: 'hazard', what: 'gravel', s: samples[r.a].s, i0: r.a });
      if (r.b < samples.length - 10) notes.push({ kind: 'hazard', what: 'tarmac', s: samples[r.b].s, i0: r.b });
    }
    for (const r of runsWhere(samples, assigned, isCobble, 40)) notes.push({ kind: 'hazard', what: 'cobbles', s: samples[r.a].s, i0: r.a });
    for (const r of runsWhere(samples, assigned, (t) => t.highway === 'construction' || t.construction, 20)) notes.push({ kind: 'hazard', what: 'roadworks', s: samples[r.a].s, i0: r.a });

    // crests
    const skip = assigned.map((t) => !!(t && ((t.bridge && t.bridge !== 'no') || (t.tunnel && t.tunnel !== 'no'))));
    for (const c of findCrests(samples, data.elevation, skip)) {
      const host = corners.find((k) => c.s >= k.s - 10 && c.s <= k.sEnd + 10);
      if (host) host.crest = true;
      else notes.push(c);
    }

    notes.push({ kind: 'finish', s: prep.length, i0: samples.length - 1 });
    notes.sort((a, b) => a.s - b.s);
    notes.forEach((n, k) => {
      n.id = k;
      const nx = notes[k + 1];
      n.gapNext = nx ? Math.max(0, nx.s - (n.sEnd || n.s)) : null;
    });
    return { notes, limits };
  }

  // ---------- phrasing ----------
  const SIMPLE = ['', 'hard', 'hard', 'medium', 'medium', 'easy', 'easy'];
  function cornerWords(n, o) {
    let w;
    if (o.mode === 'simple') w = n.hairpin ? `hairpin ${n.dir}` : `${SIMPLE[n.grade]} ${n.dir}`;
    else w = n.hairpin ? `${n.dir} hairpin` : `${n.dir} ${n.grade}`;
    const mods = [];
    if (n.shape === 'tightens') mods.push('tightens');
    if (o.mode !== 'simple') {
      if (n.shape === 'opens') mods.push('opens');
      if (n.long) mods.push('long');
      if (n.crest) mods.push('over crest');
    }
    let pre = '';
    if (n.junction === 'junction') pre = 'junction, ';
    if (n.junction === 'keep') pre = 'keep, ';
    return pre + [w, ...mods].join(' ');
  }

  function noteWords(n, o) {
    switch (n.kind) {
      case 'corner': return cornerWords(n, o);
      case 'junction': return `junction ${n.dir}`;
      case 'keep': return `keep ${n.dir}`;
      case 'roundabout': return n.exit ? `roundabout, exit ${n.exit}` : 'roundabout';
      case 'hazard': return n.what;
      case 'crest': return 'crest';
      case 'finish': return 'finish';
    }
    return '';
  }

  const M_STEPS = [30, 40, 50, 70, 100, 120, 150, 200, 250, 300];
  const FT_STEPS = [100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
  function distWord(m, units) {
    const arr = units === 'imperial' ? FT_STEPS : M_STEPS;
    const v = units === 'imperial' ? m * 3.281 : m;
    let best = arr[0];
    for (const a of arr) if (Math.abs(a - v) < Math.abs(best - v)) best = a;
    return String(best);
  }

  function noteVisible(n, o) {
    if (n.kind === 'corner') {
      if (o.detail === 'no6' && n.grade === 6 && !n.junction) return false;
      if (o.detail === 'major' && n.grade >= 5 && !n.junction) return false;
    }
    if (n.kind === 'hazard' && !o.hazards) return false;
    if (n.kind === 'hazard' && n.what === 'camera' && !o.cameras) return false;
    if (n.kind === 'crest' && !o.crests) return false;
    return true;
  }

  // Build a spoken phrase starting at note index k. Returns {text, consumed:[ids], display}
  function phrase(notes, k, o) {
    const used = [notes[k].id];
    let text = noteWords(notes[k], o);
    let cur = notes[k];
    let j = k + 1, chained = 0;
    while (j < notes.length && chained < 2) {
      const nx = notes[j];
      if (!noteVisible(nx, o)) { j++; continue; }
      if (text.split(' ').length >= 6) break; // keep each call short; the rest comes in the next call
      const gap = nx.s - (cur.sEnd || cur.s);
      if (gap < 15) text += ' into ' + noteWords(nx, o);
      else if (gap < 35) text += ' and ' + noteWords(nx, o);
      else break;
      used.push(nx.id); cur = nx; j++; chained++;
    }
    // distance to the next callable note
    while (j < notes.length && !noteVisible(notes[j], o)) j++;
    if (j < notes.length && cur.kind !== 'finish') {
      const gap = notes[j].s - (cur.sEnd || cur.s);
      if (gap >= 35 && gap <= 320) text += ', ' + distWord(gap, o.units);
    }
    return { text, used };
  }

  const api = { prepare, build, phrase, noteWords, noteVisible, distWord, STEP, gradeFromRadius };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
