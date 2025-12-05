const escpos = require("escpos");

// Enable USB adapter
escpos.USB = escpos.USB;

// Create USB device (auto-detects TM-T20III)
const device = new escpos.USB();

const printer = new escpos.Printer(device);

device.open(() => {
  printer
    .align("ct")
    .text("Hello from Raspberry Pi!")
    .newline()
    .text("TM-T20III Test Print OK")
    .newline()
    .cut()
    .close();
});
