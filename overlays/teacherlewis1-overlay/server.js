const express = require('express');
const path    = require('path');
const app     = express();

app.use(express.json());

// Explicitly set MIME types for images
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: function (res, filepath) {
    if (filepath.endsWith('.jpg') || filepath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    if (filepath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

// ── In-memory shared state (persists until server restarts) ─────────
let lastMessageAt = null;
let lastMessageType = null;
let state = {
  version: 1,
  theme: 'classic', // classic | kids | dark
  activeStudentId: 'class',
  students: {
    class: { id: 'class', name: 'Class', stars: 0, points: 0, badge: '' }
  }
};

function clampInt(n, min, max) {
  n = Number(n);
  if (!Number.isFinite(n)) return null;
  n = Math.round(n);
  return Math.max(min, Math.min(max, n));
}

function sanitizeText(v, maxLen = 140) {
  if (v === undefined) return undefined;
  const s = String(v);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(c => c.write(payload));
}

// ── Clean URL routes ─────────────────────────────────────────────
app.get('/',            (req, res) => res.redirect('/controller'));
app.get('/overlay',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'overlay.html')));
app.get('/controller',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'controller.html')));

// ── Health + status ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.get('/status', (req, res) => {
  res.json({
    ok: true,
    clients: clients.length,
    lastMessageAt,
    ts: Date.now()
  });
});

app.get('/state', (req, res) => {
  res.json({ ok: true, state, ts: Date.now() });
});

app.get('/last-message', (req, res) => {
  res.json({ ok: true, type: lastMessageType, ts: lastMessageAt, now: Date.now() });
});

// ── SSE client list ──────────────────────────────────────────────
// OBS browser source connects here and stays connected.
// When the controller sends a message we push it to all clients.
let clients = [];

app.get('/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send a heartbeat every 20s to keep the connection alive
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20000);

  clients.push(res);
  console.log(`[+] OBS connected  (${clients.length} client/s)`);

  // Send initial state snapshot immediately
  try {
    res.write(`data: ${JSON.stringify({ type: 'state', state, _ts: Date.now() })}\n\n`);
  } catch (e) {}

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(c => c !== res);
    console.log(`[-] OBS disconnected (${clients.length} client/s)`);
  });
});

// ── Message endpoint — controller POSTs here ─────────────────────
app.post('/message', (req, res) => {
  const data = req.body;
  lastMessageAt = Date.now();
  lastMessageType = (data && typeof data === 'object' && data.type) ? data.type : null;
  // Keep logs readable (avoid dumping huge payloads)
  try {
    const brief = { ...data };
    if (brief.queue && Array.isArray(brief.queue)) brief.queue = `[queue x${brief.queue.length}]`;
    console.log('[MSG]', JSON.stringify(brief));
  } catch (e) {}

  // Optionally update server state (theme / students / active student)
  if (data && typeof data === 'object') {
    if (data.theme) state.theme = sanitizeText(data.theme, 20) || state.theme;
    if (data.activeStudentId) state.activeStudentId = sanitizeText(data.activeStudentId, 40) || state.activeStudentId;

    // Back-compat / convenience:
    // If a controller sends {type:'points', student:{points:<n>}} without deltaPoints,
    // treat that points value as a delta so repeated sends accumulate.
    if (data.type === 'points' && data.deltaPoints === undefined && data.student && typeof data.student === 'object') {
      const p = clampInt(data.student.points, -999, 999);
      if (p !== null) data.deltaPoints = p;
    }

    if (data.student && typeof data.student === 'object') {
      const sid = sanitizeText(data.student.id, 40);
      if (sid) {
        const prev = state.students[sid] || { id: sid, name: sid, stars: 0, points: 0, badge: '' };
        const next = { ...prev };
        if (data.student.name !== undefined) next.name = sanitizeText(data.student.name, 40) || prev.name;
        if (data.student.badge !== undefined) next.badge = sanitizeText(data.student.badge, 40) || '';
        if (data.student.stars !== undefined) {
          const s = clampInt(data.student.stars, 0, 3);
          if (s !== null) next.stars = s;
        }
        // If deltaPoints is present, we will adjust cumulatively below.
        // Avoid overwriting points here to prevent double-counting.
        // Also: for 'rewards' type, never overwrite points (only stars/badge).
        // Points should only be set via explicit deltaPoints.
        if (data.deltaPoints === undefined && data.type !== 'rewards' && data.student.points !== undefined) {
          const p = clampInt(data.student.points, 0, 999);
          if (p !== null) next.points = p;
        }
        state.students[sid] = next;
      }
    }

    // Cumulative points adjustment (tally)
    if (data.deltaPoints !== undefined) {
      const sid =
        sanitizeText(data.activeStudentId, 40) ||
        (data.student && sanitizeText(data.student.id, 40)) ||
        state.activeStudentId;
      const dp = clampInt(data.deltaPoints, -999, 999);
      if (sid && dp !== null) {
        const prev = state.students[sid] || { id: sid, name: sid, stars: 0, points: 0, badge: '' };
        const next = { ...prev };
        next.points = Math.max(0, Math.min(999, (prev.points || 0) + dp));
        state.students[sid] = next;
        // Broadcast updated student state so overlay (and any controllers) stay in sync
        broadcast({ type: 'rewards', activeStudentId: sid, student: next, roar: false, _ts: Date.now() });
      }
    }
  }

  // Push to every connected OBS browser source
  broadcast(data);

  res.json({ ok: true, pushed: clients.length, clients: clients.length, lastMessageAt });
});

// ── Start ────────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────────┐');
  console.log('  │  Teacher Lewis1 — Overlay Server  ✓      │');
  console.log('  ├──────────────────────────────────────────┤');
  console.log(`  │  Controller  →  http://localhost:${PORT}/controller │`);
  console.log(`  │  OBS Source  →  http://localhost:${PORT}/overlay    │`);
  console.log('  └──────────────────────────────────────────┘');
  console.log('');
});
