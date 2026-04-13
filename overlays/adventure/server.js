const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4455;

// Simple static file server for the overlay files
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split('?')[0];
  let filePath = path.join(__dirname, cleanUrl === '/' ? 'mobile_tiktok_adventure.html' : cleanUrl);
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store', 'Pragma': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  const label = req.url || '/';
  console.log(`[+] Client connected (${label}) — total: ${clients.size}`);

  ws.on('message', (raw) => {
    // Relay message to all OTHER clients
    const msg = raw.toString();
    for (const c of clients) {
      if (c !== ws && c.readyState === 1) {
        c.send(msg);
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[-] Client disconnected — total: ${clients.size}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n  ✦ Adventure Server running on http://localhost:${PORT}`);
  console.log(`  ✦ Overlay:     http://localhost:${PORT}/mobile_tiktok_adventure.html`);
  console.log(`  ✦ Controller:  http://localhost:${PORT}/controller.html`);
  console.log(`  ✦ WebSocket:   ws://localhost:${PORT}\n`);
  console.log(`  In OBS → Browser Source → URL: http://localhost:${PORT}/mobile_tiktok_adventure.html`);
  console.log(`  In your browser → open: http://localhost:${PORT}/controller.html\n`);
});
