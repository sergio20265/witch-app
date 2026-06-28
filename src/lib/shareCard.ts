import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface CardData {
  name: string;
  text: string;
  artUrl: string;
  /** Рисовать ли подпись (имя+текст). У рун текст уже есть на самой картинке. */
  caption?: boolean;
  /** Заголовок нативной шторки шаринга. */
  dialogTitle?: string;
}

/**
 * Рисует карту на offscreen-canvas, сохраняет во временный файл
 * и открывает нативную шторку шаринга.
 */
export async function shareCard(card: CardData): Promise<void> {
  // --- Загружаем изображение, чтобы знать его пропорции ---
  const img = new Image();
  img.src = card.artUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('img load failed'));
  });

  // Холст по пропорциям картинки — иначе вытянутые руны сжимались под карту.
  const natW = img.naturalWidth || 600;
  const natH = img.naturalHeight || 880;
  const W = 720;
  const H = Math.max(1, Math.round((W * natH) / natW));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, W, H);

  // Подпись рисуем только для карт дня (на рунах текст уже впечатан в арт).
  if (card.caption !== false) {
    // --- Градиент снизу ---
    const grad = ctx.createLinearGradient(0, H * 0.45, 0, H);
    grad.addColorStop(0, 'rgba(5,10,7,0)');
    grad.addColorStop(0.5, 'rgba(5,10,7,0.72)');
    grad.addColorStop(1, 'rgba(5,10,7,0.93)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // --- Название карты ---
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9a45c';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.textBaseline = 'alphabetic';
    wrapText(ctx, card.name, 40, H - 240, W - 80, 64);

    // --- Цитата ---
    ctx.fillStyle = 'rgba(220,210,195,0.9)';
    ctx.font = '28px Georgia, serif';
    wrapText(ctx, `«${card.text}»`, 40, H - 160, W - 80, 38);

    // --- Водяной знак ---
    ctx.fillStyle = 'rgba(201,164,92,0.45)';
    ctx.font = '22px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('Лесной гримуар', W - 32, H - 28);
  }

  // --- Экспорт и сохранение ---
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

  await Filesystem.writeFile({
    path: 'grimoire-card-share.jpg',
    data: base64,
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    path: 'grimoire-card-share.jpg',
    directory: Directory.Cache,
  });

  await Share.share({
    title: card.name,
    text: card.text ? `«${card.text}»\n\n— Лесной гримуар` : 'Лесной гримуар',
    files: [uri],
    dialogTitle: card.dialogTitle ?? 'Поделиться картой дня',
  });
}

/** Многострочный текст на canvas с переносом по словам. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}
