// Генерирует все нужные Android-иконки из icon.png в корне проекта.
// ic_launcher / ic_launcher_round — квадратная иконка
// ic_launcher_foreground — слой для adaptive icon (108dp, иконка занимает центральные ~72%)
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC  = path.join(ROOT, 'codex-img', 'icon.png');
const RES  = path.join(ROOT, 'android/app/src/main/res');

// density → размер иконки в px
const DENSITIES = [
  { folder: 'mipmap-mdpi',    size: 48,  fgSize: 108 },
  { folder: 'mipmap-hdpi',    size: 72,  fgSize: 162 },
  { folder: 'mipmap-xhdpi',   size: 96,  fgSize: 216 },
  { folder: 'mipmap-xxhdpi',  size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function run() {
  const src = sharp(SRC);
  const meta = await src.metadata();
  console.log(`Источник: ${meta.width}×${meta.height} px`);

  for (const { folder, size, fgSize } of DENSITIES) {
    const dir = path.join(RES, folder);

    // ic_launcher.png — обычная иконка
    await sharp(SRC)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // ic_launcher_round.png — круглая (Android сам обрезает по маске)
    await sharp(SRC)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png — для adaptive icon
    // Иконка центрируется в fgSize×fgSize холсте с прозрачным отступом ~18%
    const iconInFg = Math.round(fgSize * 0.72);
    const offset   = Math.round((fgSize - iconInFg) / 2);
    const resized  = await sharp(SRC)
      .resize(iconInFg, iconInFg, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: { width: fgSize, height: fgSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: resized, top: offset, left: offset }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`${folder}: launcher ${size}px, foreground ${fgSize}px`);
  }
  console.log('\nГотово! Пересобери APK в Android Studio.');
}

run().catch(console.error);
