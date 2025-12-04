// scripts/mock-printer.js
// Minimal mock printer WebSocket server at ws://127.0.0.1:12212/printer
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/printer' });

// Where PDFs will be saved
const OUTPUT_DIR = path.resolve(process.cwd(), 'printed');

wss.on('connection', (ws, req) => {
  console.log('[mock-printer] client connected:', req.url);
  ws.send(JSON.stringify({ type: 'status', connected: true, ready: true }));

  // Optional heartbeat updates
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() }));
    }
  }, 10000);

  ws.on('message', async (data) => {
    const text = data.toString();
    console.log('[mock-printer] received:', text);

    // Try to parse JSON payloads your app sends via submit(...)
    let payload;
    try { payload = JSON.parse(text); } catch (_) {}

    // Acknowledge receipt
    ws.send(JSON.stringify({
      type: 'update',
      received: true,
      bytes: Buffer.byteLength(text),
      echoType: payload && payload.type ? payload.type : 'unknown',
      ts: Date.now()
    }));

    // === NEW: Save INVOICE PDFs ===
    try {
      if (payload && payload.type === 'INVOICE' && typeof payload.file_content === 'string') {
        // Ensure output dir exists
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });

        // Decide filename: prefer provided URL name, else timestamped
        const suggested = (payload.url && path.basename(payload.url)) || `invoice-${Date.now()}.pdf`;
        const safeName = suggested.endsWith('.pdf') ? suggested : `${suggested}.pdf`;
        const outPath = path.join(OUTPUT_DIR, safeName);

        // Decode Base64 → Buffer and write
        const pdfBuf = Buffer.from(payload.file_content, 'base64');
        fs.writeFileSync(outPath, pdfBuf);

        console.log(`[mock-printer] saved PDF -> ${outPath} (${pdfBuf.length} bytes)`);
        ws.send(JSON.stringify({
          type: 'saved',
          ok: true,
          kind: 'pdf',
          path: outPath,
          bytes: pdfBuf.length,
          ts: Date.now()
        }));
      }
    } catch (err) {
      console.error('[mock-printer] failed to save PDF:', err);
      ws.send(JSON.stringify({
        type: 'saved',
        ok: false,
        error: String(err && err.message || err),
        ts: Date.now()
      }));
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    console.log('[mock-printer] client disconnected');
  });
});

server.listen(12212, '127.0.0.1', () => {
  console.log('[mock-printer] listening at ws://127.0.0.1:12212/printer');
});
