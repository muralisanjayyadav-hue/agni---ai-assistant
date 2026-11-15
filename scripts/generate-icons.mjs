/**
 * AGNI Icon Generator — Creates all 19 PWA/TWA/Play Store icon sizes from public/logo.png
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ICONS_DIR = path.join(PUBLIC, 'icons');

fs.mkdirSync(ICONS_DIR, { recursive: true });

const logoPath = path.join(PUBLIC, 'logo.png');
if (!fs.existsSync(logoPath)) {
  console.error('❌ public/logo.png not found!');
  process.exit(1);
}

const logoBuffer = fs.readFileSync(logoPath);

// Sizes required for Android / PWA / Play Store / TWA
const sizes = [48, 72, 96, 128, 144, 192, 384, 512];

async function generate() {
  console.log('🔥 Generating 19 AGNI icons from official logo.png...\n');

  // 1. Generate "any" icons for all standard sizes (8 icons)
  for (const size of sizes) {
    const anyPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(logoBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(anyPath);
    console.log(`  ✅ ${path.basename(anyPath)} (${size}x${size} any)`);
  }

  // 2. Generate "maskable" icons with safe-zone padding (8 icons)
  for (const size of sizes) {
    const maskablePath = path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`);
    const innerSize = Math.round(size * 0.8);
    const innerBuffer = await sharp(logoBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toBuffer();

    const padding = Math.floor((size - innerSize) / 2);

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([{ input: innerBuffer, top: padding, left: padding }])
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(maskablePath);

    console.log(`  ✅ ${path.basename(maskablePath)} (${size}x${size} maskable)`);
  }

  // 3. Apple Touch Icon (180x180) (1 icon)
  const applePath = path.join(ICONS_DIR, 'apple-touch-icon.png');
  await sharp(logoBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(applePath);
  console.log(`  ✅ apple-touch-icon.png (180x180)`);

  // 4. Favicon 32x32 (1 icon)
  const favicon32Path = path.join(ICONS_DIR, 'favicon-32x32.png');
  await sharp(logoBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(favicon32Path);
  console.log(`  ✅ favicon-32x32.png (32x32)`);

  // 5. Favicon 16x16 (1 icon)
  const favicon16Path = path.join(ICONS_DIR, 'favicon-16x16.png');
  await sharp(logoBuffer)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(favicon16Path);
  console.log(`  ✅ favicon-16x16.png (16x16)`);

  // Also create root favicon.ico if possible or ensure public/favicon.png
  const rootFavicon = path.join(PUBLIC, 'favicon.png');
  await sharp(logoBuffer)
    .resize(64, 64)
    .png()
    .toFile(rootFavicon);
  console.log(`  ✅ public/favicon.png (64x64)`);

  console.log('\n🎉 Successfully generated 19 official icons from logo.png!');
}

generate().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
