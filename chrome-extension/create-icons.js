const fs = require('fs');
const path = require('path');

// Create minimal valid PNG files (1x1 pixel, but Chrome requires specific sizes)
// For demo purposes, we'll create simple PNGs using raw binary data

function createPNG(width, height) {
  // Minimal PNG creation (simplified - creates a blue square)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT chunk (image data - simplified)
  // For a real icon, you'd want to use a proper image library
  // For demo, we'll create a minimal valid PNG with a gradient
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Blue gradient
      rawData.push(79); // R
      rawData.push(70); // G
      rawData.push(229); // B
    }
  }
  
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const sizes = [16, 32, 48, 128];
const distIcons = path.join(__dirname, 'dist', 'icons');

sizes.forEach(size => {
  const png = createPNG(size, size);
  fs.writeFileSync(path.join(distIcons, `icon${size}.png`), png);
  console.log(`Created icon${size}.png`);
});

console.log('Icons created successfully!');
