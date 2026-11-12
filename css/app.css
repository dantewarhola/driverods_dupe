:root {
  --bg: #0d0f12; --panel: #161a20; --panel2: #1d222a; --line: #2a3039; --ink: #eef1f5; --muted: #8b95a3;
  --accent: #ffb020; --hard: #ff4d4f; --med: #ffa940; --easy: #52c41a; --blue: #4096ff;
  --st: env(safe-area-inset-top); --sb: env(safe-area-inset-bottom); --sl: env(safe-area-inset-left); --sr: env(safe-area-inset-right);
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; height: 100%; overflow: hidden; background: var(--bg); color: var(--ink); font: 16px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.hidden { display: none !important; }
button { font: inherit; color: var(--ink); background: #232932; border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; cursor: pointer; }
button.primary { background: var(--accent); color: #111; border-color: var(--accent); font-weight: 700; }
button.danger { background: #5a1d20; border-color: #8a2a2f; }
button:disabled { opacity: .45; }
input, select { font: inherit; color: var(--ink); background: #0f1216; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; width: 100%; }
.chip { font-size: 13px; padding: 6px 12px; border-radius: 999px; }
.chip.on { background: var(--accent); color: #111; border-color: var(--accent); }
.row { display: flex; gap: 8px; align-items: center; }
.row.between { justify-content: space-between; }
.grow { flex: 1; }
.hint { font-size: 13px; color: var(--muted); }
.hint.small { font-size: 12px; margin-top: 14px; }

#map { position: fixed; inset: 0; z-index: 0; background: #111; }
.leaflet-container { background: #111; }
.leaflet-control-attribution { font-size: 9px !important; line-height: 1.3 !important; background: rgba(13,15,18,.65) !important; color: #8b95a3 !important; max-width: 70%; }
.leaflet-control-attribution a { color: #9ab !important; }

/* ---------- plan mode ---------- */
.card { background: rgba(22,26,32,.96); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 6px 24px rgba(0,0,0,.45); }
#planPanel { position: fixed; z-index: 500; top: calc(var(--st) + 8px); left: calc(var(--sl) + 8px); right: calc(var(--sr) + 8px); padding: 10px 12px 10px; display: flex; flex-direction: column; gap: 8px; max-width: 560px; margin: 0 auto; }
.titlebar { display: flex; align-items: center; justify-content: space-between; }
.titlebar h1 { font-size: 16px; margin: 0; letter-spacing: .5px; }
.titlebar h1 b { color: var(--accent); }
.field { position: relative; display: flex; gap: 8px; align-items: center; }
.field input { flex: 1; }
.field .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.dot.start { background: var(--easy); } .dot.end { background: var(--hard); }
button.mini { padding: 10px 12px; font-size: 14px; flex: none; }
.dropdown { position: absolute; top: 100%; left: 18px; right: 0; z-index: 10; background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; margin-top: 4px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
.dropdown:empty { display: none; }
.dropdown button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; background: transparent; padding: 10px 12px; }
.dropdown button:last-child { border-bottom: 0; }
.dropdown .sub { display: block; font-size: 12px; color: var(--muted); margin-top: 2px; }

.fab { position: fixed; z-index: 450; right: calc(var(--sr) + 12px); bottom: calc(var(--sb) + 24px); width: 50px; height: 50px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; background: var(--panel); box-shadow: 0 4px 14px rgba(0,0,0,.5); color: var(--ink); }
.fab.on { color: var(--blue); border-color: var(--blue); }
body.has-preview .fab { bottom: calc(var(--sb) + 46vh + 12px); }
.speedchip { position: fixed; z-index: 450; left: calc(var(--sl) + 12px); bottom: calc(var(--sb) + 24px); background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 6px 12px; font-weight: 800; font-size: 22px; box-shadow: 0 4px 14px rgba(0,0,0,.5); }
.speedchip small { font-size: 12px; color: var(--muted); font-weight: 600; margin-left: 4px; }
body.has-preview .speedchip { bottom: calc(var(--sb) + 46vh + 12px); }

.sheet { position: fixed; z-index: 500; left: 0; right: 0; bottom: 0; max-height: 46vh; background: var(--panel); border-top: 1px solid var(--line); border-radius: 16px 16px 0 0; display: flex; flex-direction: column; padding-bottom: var(--sb); box-shadow: 0 -6px 24px rgba(0,0,0,.45); }
.sheet .grab { width: 40px; height: 4px; border-radius: 2px; background: #3a414c; margin: 8px auto 4px; flex: none; }
#routeOpts { display: flex; gap: 8px; overflow-x: auto; padding: 4px 12px 8px; flex: none; }
.ropt { flex: none; min-width: 150px; text-align: left; padding: 8px 10px; background: #0f1216; }
.ropt.sel { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.ropt .t { font-weight: 800; font-size: 17px; }
.ropt .m { font-size: 12px; color: var(--muted); }
.ropt .tag { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: .5px; padding: 2px 6px; border-radius: 6px; background: #2b3340; margin-right: 4px; margin-top: 4px; }
.ropt .tag.tw { background: #4a2a10; color: var(--accent); }
#summary { padding: 0 14px 8px; display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 13px; color: var(--muted); flex: none; }
#summary b { color: var(--ink); }
#actions { padding: 0 12px 10px; display: flex; gap: 8px; align-items: center; flex: none; }
#actions .big { flex: 1; padding: 12px; font-size: 18px; }
#actions select { width: auto; padding: 10px 8px; }
#notelist { overflow: auto; border-top: 1px solid var(--line); flex: 1; }
.n { display: flex; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #1e232a; font-size: 15px; }
.n .d { color: var(--muted); width: 66px; flex: none; font-variant-numeric: tabular-nums; }
.g1, .g2 { color: var(--hard); } .g3, .g4 { color: var(--med); } .g5, .g6 { color: var(--easy); } .hz { color: #69b1ff; } .nv { color: #d3adf7; }

#ctxMenu { position: fixed; z-index: 900; display: flex; gap: 6px; padding: 6px; background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.6); transform: translate(-50%, -120%); }
#ctxMenu button { padding: 8px 12px; font-size: 14px; }

/* ---------- drive mode ---------- */
body.driving #planPanel, body.driving #preview, body.driving .fab, body.driving #planSpeed { display: none !important; }
#driveHud { position: fixed; inset: 0; z-index: 600; pointer-events: none; }
#driveHud > * { pointer-events: auto; }
#navBanner { position: absolute; top: calc(var(--st) + 8px); left: calc(var(--sl) + 8px); right: calc(var(--sr) + 8px); display: flex; gap: 12px; align-items: center; background: rgba(18,61,40,.95); border-radius: 14px; padding: 10px 14px; box-shadow: 0 6px 20px rgba(0,0,0,.5); max-width: 560px; margin: 0 auto; }
#navBanner.empty { display: none; }
#navArrow { width: 44px; height: 44px; flex: none; }
#navArrow svg { width: 100%; height: 100%; }
.navtxt { min-width: 0; }
#navDist { font-size: 22px; font-weight: 800; }
#navText { font-size: 15px; color: #d9f7be; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#hudLeft { position: absolute; left: calc(var(--sl) + 10px); top: calc(var(--st) + 92px); display: flex; flex-direction: column; gap: 8px; align-items: center; }
#speedBox { background: rgba(13,15,18,.9); border: 1px solid var(--line); border-radius: 14px; padding: 6px 10px; text-align: center; min-width: 74px; box-shadow: 0 4px 14px rgba(0,0,0,.5); }
#speed { font-size: 34px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
#speedBox.over #speed { color: var(--hard); }
#speedunit { font-size: 11px; color: var(--muted); }
#limit { width: 52px; height: 52px; border-radius: 50%; border: 5px solid #d4380d; background: #fff; color: #111; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 19px; box-shadow: 0 4px 14px rgba(0,0,0,.5); }
#limit.us { border-radius: 8px; border: 2px solid #111; outline: 2px solid #fff; flex-direction: column; font-size: 20px; line-height: 1; }
#limit.us::before { content: 'LIMIT'; font-size: 8px; font-weight: 700; }
#hudRight { position: absolute; right: calc(var(--sr) + 10px); top: calc(var(--st) + 92px); display: flex; flex-direction: column; gap: 8px; }
.round { width: 62px; height: 44px; border-radius: 12px; padding: 0; font-size: 11px; font-weight: 800; letter-spacing: .5px; background: rgba(13,15,18,.9); box-shadow: 0 4px 14px rgba(0,0,0,.5); }
.round.on { background: var(--accent); color: #111; }
.round.danger { background: rgba(90,29,32,.95); }

#rallyPanel { position: absolute; left: calc(var(--sl) + 8px); right: calc(var(--sr) + 8px); bottom: calc(var(--sb) + 8px); background: rgba(13,15,18,.94); border: 1px solid var(--line); border-radius: 18px; padding: 10px 16px 10px; box-shadow: 0 -6px 24px rgba(0,0,0,.5); max-width: 640px; margin: 0 auto; transition: padding .2s; }
#panelToggle { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 90px; height: 26px; border: 0; background: transparent; padding: 0; }
#panelToggle span { display: block; width: 44px; height: 5px; border-radius: 3px; background: #4a525e; margin: 0 auto; }
#call { text-align: center; font-weight: 800; font-size: clamp(30px, 9.5vw, 72px); line-height: 1.05; text-transform: uppercase; letter-spacing: .5px; padding: 14px 0 6px; }
#callDist { display: block; font-size: .42em; color: var(--accent); margin-top: 6px; letter-spacing: 1px; }
#call.flash #callMain { animation: flash .6s; }
@keyframes flash { from { color: var(--accent); } to { color: var(--ink); } }
#next { font-size: 18px; color: var(--muted); min-height: 24px; }
#next div { display: flex; gap: 12px; padding: 2px 0; }
#next span { width: 70px; flex: none; font-variant-numeric: tabular-nums; }
#next b { text-transform: uppercase; font-weight: 600; }
#driveFoot { display: flex; gap: 10px; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 6px; }

/* minimized: one line of text at the bottom, map fully visible */
#rallyPanel.min { padding: 8px 14px 8px; border-radius: 14px; }
#rallyPanel.min #panelToggle { height: 100%; width: 100%; top: 0; left: 0; transform: none; }
#rallyPanel.min #panelToggle span { display: none; }
#rallyPanel.min #call { font-size: 22px; padding: 0; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: baseline; gap: 10px; }
#rallyPanel.min #callMain { overflow: hidden; text-overflow: ellipsis; }
#rallyPanel.min #callDist { display: inline; font-size: 15px; margin: 0; flex: none; }
#rallyPanel.min #next, #rallyPanel.min #driveFoot { display: none; }
#rallyPanel.min::after { content: '▴'; position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 14px; }

.car-icon { width: 36px; height: 36px; }
.car-icon div { width: 36px; height: 36px; transition: transform .4s linear; }
.car-icon svg { width: 36px; height: 36px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); }
.me-dot { width: 18px; height: 18px; border-radius: 50%; background: var(--blue); border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(64,150,255,.25); }

/* ---------- settings ---------- */
#settings { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 2000; display: flex; align-items: flex-end; }
#settings .sheetbody { background: var(--panel); width: 100%; max-height: 88vh; overflow: auto; border-radius: 16px 16px 0 0; padding: 16px 16px calc(var(--sb) + 16px); max-width: 640px; margin: 0 auto; }
#settings label { display: block; font-size: 13px; color: var(--muted); margin: 12px 0 4px; }
.toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.toggles label { display: flex !important; gap: 8px; align-items: center; color: var(--ink) !important; font-size: 14px !important; margin: 0 !important; background: #0f1216; border: 1px solid var(--line); border-radius: 10px; padding: 10px; }
.toggles input { width: auto; }
