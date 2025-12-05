// real-printer.js
// WebSocket → TEXT-only ESC/POS print server for Raspberry Pi + Epson TM-T20III

const fs = require("fs");
const http = require("http");
const WebSocket = require("ws");
const { printLines } = require("./printer-device");



// Top-level payload handler: TEXT ONLY
function handlePrintPayload(payload, done) {
  // 1) Your main case: KITCHEN_TICKET with lines[]
  if (payload && payload.type === "KITCHEN_TICKET" && Array.isArray(payload.lines)) {
    return printLines(payload.lines, done);
  }

  // 2) Optional: simple TEXT jobs
  if (payload && payload.type === "TEXT" && typeof payload.text === "string") {
    return printLines([payload.text], done);
  }

  // 3) Explicitly ignore INVOICE PDFs (no saving, no printing)
  if (payload && payload.type === "INVOICE") {
    console.log("[printer] INVOICE payload received - ignoring (text-only mode)");
    return done(null);
  }

  // 4) Fallback: print JSON dump if nothing matches
  const json = JSON.stringify(payload ?? {});
  return printLines([json, "", ""], done);
}

// Load TLS cert + key
const key = fs.readFileSync("/etc/printer-wss/printer.key");
const cert = fs.readFileSync("/etc/printer-wss/printer.crt");

// HTTP + WebSocket server
const server = http.createServer({ key, cert });
const wss = new WebSocket.Server({ server, path: "/printer" });

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log("[printer-ws] client connected from", ip, "url:", req.url);

  ws.send(
    JSON.stringify({
      type: "status",
      connected: true,
      ready: true,
      ts: Date.now(),
    })
  );

  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }));
    }
  }, 10000);

  ws.on("message", (data) => {
    let text;
    try {
      text = data.toString();
    } catch {
      console.warn("[printer-ws] received non-text frame");
      return;
    }

    console.log("[printer-ws] received:", text);

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      console.warn("[printer-ws] failed to parse JSON, printing raw text");
      payload = { type: "TEXT", text };
    }

    ws.send(
      JSON.stringify({
        type: "update",
        received: true,
        bytes: Buffer.byteLength(text),
        payloadType: payload && payload.type ? payload.type : "unknown",
        ts: Date.now(),
      })
    );

    handlePrintPayload(payload, (err) => {
      if (err) {
        console.error("[printer-ws] print failed:", err);
        ws.send(
          JSON.stringify({
            type: "print-result",
            ok: false,
            error: String(err && err.message ? err.message : err),
            ts: Date.now(),
          })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "print-result",
            ok: true,
            ts: Date.now(),
          })
        );
      }
    });
  });

  ws.on("close", () => {
    clearInterval(heartbeat);
    console.log("[printer-ws] client disconnected");
  });

  ws.on("error", (err) => {
    console.error("[printer-ws] socket error:", err);
  });
});

const PORT = 12212;
server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[printer-ws] listening on wss://0.0.0.0:${PORT}/printer (try ws://printer-pi.local:${PORT}/printer)`
  );
});
