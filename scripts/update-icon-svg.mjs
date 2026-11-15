import fs from 'fs';
import path from 'path';

const icon512Path = path.resolve('public/icons/icon-512x512.png');
const b64 = fs.readFileSync(icon512Path).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#000000"/>
  <image href="data:image/png;base64,${b64}" width="512" height="512"/>
</svg>`;

fs.writeFileSync(path.resolve('public/icon.svg'), svg, 'utf8');
console.log('✅ public/icon.svg updated with official logo');
