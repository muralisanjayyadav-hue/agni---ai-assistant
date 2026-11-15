import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const logoPath = path.resolve('public/logo.png');
const resDir = path.resolve('android/app/src/main/res');

// Density mappings
// ic_launcher & round: 48, 72, 96, 144, 192
// foreground (108dp base): 108, 162, 216, 324, 432
const densities = [
  { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function generate() {
  console.log('Generating Android icons from:', logoPath);

  // 1. Ensure ic_launcher_background is #000000
  const bgXmlPath = path.join(resDir, 'values', 'ic_launcher_background.xml');
  fs.writeFileSync(
    bgXmlPath,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n`
  );
  console.log('Updated ic_launcher_background to #000000');

  // 2. Remove default vector ic_launcher_foreground.xml in drawable-v24 so mipmap PNGs are used
  const oldVectorPath = path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml');
  if (fs.existsSync(oldVectorPath)) {
    fs.unlinkSync(oldVectorPath);
    console.log('Removed default Capacitor vector:', oldVectorPath);
  }

  // 3. Ensure drawable directory has 512x512 icon
  const drawableIcon = path.join(resDir, 'drawable', 'ic_launcher.png');
  await sharp(logoPath).resize(512, 512, { fit: 'contain', background: '#000000' }).png().toFile(drawableIcon);
  console.log('Generated:', drawableIcon);

  // 4. Generate all mipmap sizes
  for (const d of densities) {
    const targetDir = path.join(resDir, d.folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    const launcherPath = path.join(targetDir, 'ic_launcher.png');
    await sharp(logoPath).resize(d.size, d.size, { fit: 'contain', background: '#000000' }).png().toFile(launcherPath);

    // ic_launcher_round.png
    const roundPath = path.join(targetDir, 'ic_launcher_round.png');
    // create rounded circular mask
    const radius = Math.floor(d.size / 2);
    const circleMask = Buffer.from(
      `<svg width="${d.size}" height="${d.size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#000" /></svg>`
    );
    await sharp(logoPath)
      .resize(d.size, d.size, { fit: 'contain', background: '#000000' })
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(roundPath);

    // ic_launcher_foreground.png (108dp base canvas, inner icon centered with safe margin)
    const fgPath = path.join(targetDir, 'ic_launcher_foreground.png');
    const innerSize = Math.floor(d.fgSize * 0.72); // 72% inner safe area
    const innerBuffer = await sharp(logoPath)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const padding = Math.floor((d.fgSize - innerSize) / 2);
    await sharp({
      create: {
        width: d.fgSize,
        height: d.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: innerBuffer, top: padding, left: padding }])
      .png()
      .toFile(fgPath);

    console.log(`Generated ${d.folder}: ic_launcher (${d.size}x${d.size}), ic_launcher_round, ic_launcher_foreground (${d.fgSize}x${d.fgSize})`);
  }

  console.log('All Android icons generated successfully!');
}

generate().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
