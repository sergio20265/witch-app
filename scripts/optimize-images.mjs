// Resizes & optimizes source backgrounds (NN.jpg) and cards (cards/*.png)
// into WebP assets used by the app. Run: node scripts/optimize-images.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const BG_OUT = path.join(ROOT, 'src/assets/backgrounds');
const CARD_OUT = path.join(ROOT, 'src/assets/cards');
const WHEEL_OUT = path.join(ROOT, 'src/assets/wheel');
const RUNE_OUT = path.join(ROOT, 'src/assets/runes');
const PATH_OUT = path.join(ROOT, 'src/assets/path');
fs.mkdirSync(BG_OUT, { recursive: true });
fs.mkdirSync(CARD_OUT, { recursive: true });
fs.mkdirSync(WHEEL_OUT, { recursive: true });
fs.mkdirSync(RUNE_OUT, { recursive: true });
fs.mkdirSync(PATH_OUT, { recursive: true });

// Логотипы праздников (кириллические имена файлов → id праздника).
const WHEEL_MAP = {
  'йоль': 'yule',
  'имболк': 'imbolc',
  'остара': 'ostara',
  'белтейн': 'beltane',
  'лита': 'litha',
  'лугнасад': 'lughnasadh',
  'мабон': 'mabon',
  'самайн': 'samhain',
};

// Mobile portrait backgrounds: cap to 1080px wide (covers most Android screens),
// WebP q72 keeps them small but atmospheric.
const BG_W = 1080;
const CARD_W = 800;

let before = 0, after = 0;

async function run() {
  const bgs = fs.readdirSync(ROOT).filter((f) => /^\d+\.jpg$/i.test(f)).sort();
  for (const f of bgs) {
    const src = path.join(ROOT, f);
    const num = f.replace(/\.jpg$/i, '');
    const out = path.join(BG_OUT, `bg-${num}.webp`);
    const meta = await sharp(src).metadata();
    before += fs.statSync(src).size;
    await sharp(src)
      .resize({ width: Math.min(BG_W, meta.width), withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(out);
    after += fs.statSync(out).size;
    console.log(`bg  ${f} ${meta.width}x${meta.height} -> bg-${num}.webp`);
  }

  const cards = fs.readdirSync(path.join(ROOT, 'cards')).filter((f) => /\.png$/i.test(f)).sort();
  for (const f of cards) {
    const src = path.join(ROOT, 'cards', f);
    const num = f.replace(/\.png$/i, '');
    const out = path.join(CARD_OUT, `card-${num}.webp`);
    const meta = await sharp(src).metadata();
    before += fs.statSync(src).size;
    await sharp(src)
      .resize({ width: Math.min(CARD_W, meta.width), withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(out);
    after += fs.statSync(out).size;
    console.log(`card ${f} ${meta.width}x${meta.height} -> card-${num}.webp`);
  }

  // Руны: исходники runes/NN.jpg → src/assets/runes/rune-NN.webp (как карты).
  const runesDir = path.join(ROOT, 'runes');
  if (fs.existsSync(runesDir)) {
    const runes = fs.readdirSync(runesDir).filter((f) => /\.jpe?g$/i.test(f)).sort();
    for (const f of runes) {
      const src = path.join(runesDir, f);
      const num = f.replace(/\.jpe?g$/i, '');
      const out = path.join(RUNE_OUT, `rune-${num}.webp`);
      const meta = await sharp(src).metadata();
      before += fs.statSync(src).size;
      await sharp(src)
        .resize({ width: Math.min(CARD_W, meta.width), withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(out);
      after += fs.statSync(out).size;
      console.log(`rune ${f} ${meta.width}x${meta.height} -> rune-${num}.webp`);
    }
  }

  const wheelDir = path.join(ROOT, 'wheel');
  if (fs.existsSync(wheelDir)) {
    for (const f of fs.readdirSync(wheelDir).filter((x) => /\.png$/i.test(x))) {
      const base = f.replace(/\.png$/i, '').toLowerCase();
      const id = WHEEL_MAP[base];
      if (!id) {
        console.warn(`wheel ${f} — нет соответствия id, пропуск`);
        continue;
      }
      const src = path.join(wheelDir, f);
      const out = path.join(WHEEL_OUT, `${id}.webp`);
      const meta = await sharp(src).metadata();
      before += fs.statSync(src).size;
      await sharp(src)
        .resize({ width: Math.min(480, meta.width), withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90 }) // прозрачность сохраняем
        .toFile(out);
      after += fs.statSync(out).size;
      console.log(`wheel ${f} ${meta.width}x${meta.height} -> ${id}.webp`);
    }
  }

  // Сцены «Моей тропинки»: story/path-*.{jpg,png} → src/assets/path/path-*.webp
  const storyDir = path.join(ROOT, 'story');
  if (fs.existsSync(storyDir)) {
    const stories = fs.readdirSync(storyDir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
    for (const f of stories) {
      const src = path.join(storyDir, f);
      const base = f.replace(/\.(jpe?g|png)$/i, '');
      const out = path.join(PATH_OUT, `${base}.webp`);
      const meta = await sharp(src).metadata();
      before += fs.statSync(src).size;
      await sharp(src)
        .resize({ width: Math.min(BG_W, meta.width), withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(out);
      after += fs.statSync(out).size;
      console.log(`path ${f} ${meta.width}x${meta.height} -> ${base}.webp`);
    }
  }

  // Фамильяры: pets/familiar-*.jpg → портреты-карточки (src/assets/familiars/),
  // pets/icon-*.png → маленькие иконки на прозрачном фоне (альфа сохраняется).
  const petsDir = path.join(ROOT, 'pets');
  if (fs.existsSync(petsDir)) {
    const FAM_OUT = path.join(ROOT, 'src/assets/familiars');
    fs.mkdirSync(FAM_OUT, { recursive: true });
    for (const f of fs.readdirSync(petsDir).filter((x) => /^familiar-.*\.(jpe?g|png)$/i.test(x)).sort()) {
      const src = path.join(petsDir, f);
      const base = f.replace(/\.(jpe?g|png)$/i, '');
      const out = path.join(FAM_OUT, `${base}.webp`);
      const meta = await sharp(src).metadata();
      before += fs.statSync(src).size;
      await sharp(src)
        .resize({ width: Math.min(BG_W, meta.width), withoutEnlargement: true })
        .webp({ quality: 74 })
        .toFile(out);
      after += fs.statSync(out).size;
      console.log(`pet  ${f} ${meta.width}x${meta.height} -> ${base}.webp`);
    }
    for (const f of fs.readdirSync(petsDir).filter((x) => /^icon-.*\.png$/i.test(x)).sort()) {
      const src = path.join(petsDir, f);
      const base = f.replace(/\.png$/i, '');
      const out = path.join(FAM_OUT, `${base}.webp`);
      const meta = await sharp(src).metadata();
      before += fs.statSync(src).size;
      await sharp(src)
        .resize({ width: Math.min(256, meta.width), withoutEnlargement: true })
        .webp({ quality: 86, alphaQuality: 100 }) // прозрачность иконок сохраняем
        .toFile(out);
      after += fs.statSync(out).size;
      console.log(`icon ${f} ${meta.width}x${meta.height} -> ${base}.webp`);
    }
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(2);
  console.log(`\nTotal: ${mb(before)} MB -> ${mb(after)} MB (${Math.round((1 - after / before) * 100)}% smaller)`);
}

run();
