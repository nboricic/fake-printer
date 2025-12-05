// printer-device.js
// Raw ESC/POS writer for /dev/usb/lp0 (Epson TM-T20III via UB-U05)

const fs = require("fs");

const DEVICE = "/dev/usb/lp0";

const ESC = "\x1b";
const GS = "\x1d";
const RESET = ESC + "@";
const CUT_FULL = GS + "V" + "\x00";

/**
 * Print an array of text lines to the USB receipt printer.
 * @param {string[]} lines
 * @param {(err: Error | null) => void} cb
 */
function printLines(lines, cb) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return cb(new Error("No lines to print"));
  }

  const text = lines.join("\n") + "\n\n\n"; // a few blank lines at end
  const payload = RESET + text + CUT_FULL;

  fs.writeFile(DEVICE, payload, "binary", (err) => {
    if (err) {
      console.error("[printer] write failed:", err);
      return cb(err);
    }
    cb(null);
  });
}

module.exports = { printLines };
