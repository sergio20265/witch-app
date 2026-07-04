import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'lastimg');
const OUT = path.join(ROOT, 'src/assets/path');

const rename = new Map([
  ['path-dev-runes', 'path-dev-rune-witch'],
]);

fs.mkdirSync(OUT, { recursive: true });

let before = 0;
let after = 0;

for (const file of fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort()) {
  const source = path.join(SRC, file);
  const rawBase = file.replace(/\.(jpe?g|png)$/i, '');
  const base = rename.get(rawBase) ?? rawBase;
  const target = path.join(OUT, `${base}.webp`);
  const meta = await sharp(source).metadata();
  before += fs.statSync(source).size;

  await sharp(source)
    .resize({ width: Math.min(1080, meta.width ?? 1080), withoutEnlargement: true })
    .webp({ quality: 74 })
    .toFile(target);

  after += fs.statSync(target).size;
  console.log(`${file} -> src/assets/path/${base}.webp`);
}

const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log(`Imported ${mb(before)} MB -> ${mb(after)} MB`);
