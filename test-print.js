const escpos = require("escpos");
escpos.USB = escpos.USB;

const device = new escpos.USB();
const printer = new escpos.Printer(device);

device.open(() => {
  printer
    .text("Hello from Raspberry Pi!")
    .newline()
    .cut()
    .close();
});
