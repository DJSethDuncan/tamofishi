// Generates a 1024x1024 PNG icon from the walking crab pixel art.
// Run: node scripts/gen-icon.js
// Outputs: assets/icon.png

const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const GRID = 7;
const PX = Math.floor(SIZE / GRID);
const OFF = Math.floor((SIZE - GRID * PX) / 2);

function createPNG(width, height, pixels) {
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let v = n;
      for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
      table[n] = v;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function adler32(buf) {
    let a = 1, b = 0;
    for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crcB]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4, di = y * rowLen + 1 + x * 4;
      raw[di] = pixels[si]; raw[di+1] = pixels[si+1]; raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
    }
  }
  const MAX_BLOCK = 65535, blocks = [];
  for (let i = 0; i < raw.length; i += MAX_BLOCK) {
    const end = Math.min(i + MAX_BLOCK, raw.length);
    const blockData = raw.slice(i, end);
    const header = Buffer.alloc(5);
    header[0] = end === raw.length ? 1 : 0;
    header.writeUInt16LE(blockData.length, 1);
    header.writeUInt16LE(~blockData.length & 0xffff, 3);
    blocks.push(header, blockData);
  }
  const adlerB = Buffer.alloc(4); adlerB.writeUInt32BE(adler32(raw));
  const compressed = Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, adlerB]);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const pixels = Buffer.alloc(SIZE * SIZE * 4);

function fill(gx, gy, r, g, b) {
  const x0 = OFF + gx * PX, y0 = OFF + gy * PX;
  for (let py = y0; py < y0 + PX && py < SIZE; py++)
    for (let px = x0; px < x0 + PX && px < SIZE; px++) {
      const i = (py * SIZE + px) * 4;
      pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255;
    }
}

const cx = 3, bodyY = 2, legY = 3;
// Body
fill(cx - 1, bodyY, 0x2a, 0x8a, 0x2a);
fill(cx,     bodyY, 0x2a, 0x8a, 0x2a);
fill(cx + 1, bodyY, 0x2a, 0x8a, 0x2a);
// Eyes
fill(cx - 1, bodyY, 0x33, 0xff, 0x33);
fill(cx + 1, bodyY, 0x33, 0xff, 0x33);
// Legs
fill(cx - 2, legY, 0x2a, 0x8a, 0x2a);
fill(cx + 2, legY, 0x2a, 0x8a, 0x2a);

const outDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(path.join(outDir, 'icon.png'), createPNG(SIZE, SIZE, pixels));
console.log('Generated assets/icon.png (walking crab)');
