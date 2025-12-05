// test-print.js
const escpos = require("escpos");
// plug in the USB adapter
const USB = require("escpos-usb");

// If this throws, escpos-usb isn't installed or its native deps are missing
const device = new USB(); // you can also pass VID/PID explicitly

const printer = new escpos.Printer(device);

device.open((err) => {
  if (err) {
    console.error("Failed to open printer:", err);
    return;
  }

  printer
    .align("ct")
    .text("Hello from Raspberry Pi!")
    .newline()
    .text("TM-T20III Test Print OK")
    .newline()
    .cut()
    .close();
});
