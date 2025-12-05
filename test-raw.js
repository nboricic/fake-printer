// test-raw.js
// Send raw ESC/POS to TM-T20III via /dev/usb/lp0

const fs = require("fs");

// Adjust if your device path is different:
const DEVICE = "/dev/usb/lp0";

// ESC/POS helpers
const ESC = "\x1b";
const GS = "\x1d";

const RESET = ESC + "@";      // Initialize printer
const CUT = GS + "V" + "\x00"; // Full cut

const content =
  RESET +
  "Hello from Raspberry Pi!\n" +
  "TM-T20III / UB-U05 via /dev/usb/lp0\n\n\n\n" +
  CUT;

fs.writeFile(DEVICE, content, "binary", (err) => {
  if (err) {
    console.error("Failed to write to printer:", err);
  } else {
    console.log("Print job sent successfully.");
  }
});
