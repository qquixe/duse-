const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'assets', 'düse logo revize.svg');
const iconDir = path.join(__dirname, 'assets', 'app-icon');

// SVG viewBox: 623.6 x 297.1 — yatay logo, kare ikona ortalayacağız
// Her ikon boyutu için logo etrafına koyu arka plan ekle

async function makeIcon(size, outputPath, padding = 0.15) {
  const logoWidth  = Math.round(size * (1 - padding * 2));
  const logoHeight = Math.round(logoWidth * (297.1 / 623.6));
  const top  = Math.round((size - logoHeight) / 2);
  const left = Math.round((size - logoWidth)  / 2);

  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#07080f"/>
    </svg>`
  );

  await sharp(svgPath)
    .resize(logoWidth, logoHeight)
    .toBuffer()
    .then(logoBuffer =>
      sharp(bg)
        .composite([{ input: logoBuffer, top, left }])
        .png()
        .toFile(outputPath)
    );

  console.log(`✓ ${path.basename(outputPath)} (${size}x${size})`);
}

async function makeMaskable(size, outputPath) {
  // Maskable: %80 safe zone — logo daha küçük
  return makeIcon(size, outputPath, 0.25);
}

(async () => {
  await makeIcon(192,  path.join(iconDir, 'icon-192.png'));
  await makeIcon(512,  path.join(iconDir, 'icon-512.png'));
  await makeMaskable(512, path.join(iconDir, 'icon-512-maskable.png'));
  console.log('Tüm ikonlar üretildi.');
})();
