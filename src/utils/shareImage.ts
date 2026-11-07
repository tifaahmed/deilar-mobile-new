import type { Scene } from '../data/pointsScenes';

/** The picture that goes with a shared result: the result screen (face, points, title) and the Deilar discount card line. */
export async function resultImage(scene: Scene, score: number, isAr: boolean): Promise<Blob | null> {
  try {
    const w = 1080;
    const h = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    if (!c) return null;

    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, scene.colors[0]);
    g.addColorStop(0.5, scene.colors[1]);
    g.addColorStop(1, scene.colors[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    // Soft decoration: the screen's own things scattered around.
    c.globalAlpha = 0.25;
    c.font = '90px sans-serif';
    c.textAlign = 'center';
    scene.drift.forEach((e, i) => {
      for (let k = 0; k < 4; k++) c.fillText(e, ((i * 4 + k) * 211) % w, 140 + ((i * 4 + k) * 173) % 1100);
    });
    c.globalAlpha = 1;

    const ink = scene.ink.includes('amber') ? '#451a03' : '#ffffff';
    c.fillStyle = ink;
    c.direction = isAr ? 'rtl' : 'ltr';
    c.textAlign = 'center';

    c.font = 'bold 190px sans-serif';
    c.fillText(`+${Math.max(0, Math.round(score))}`, w / 2, 250);
    c.font = 'bold 56px sans-serif';
    c.fillText(isAr ? 'نقطة ولاء' : 'loyalty points', w / 2, 330);

    c.font = '460px sans-serif';
    c.fillText(scene.emoji, w / 2, 800);

    c.font = 'bold 78px sans-serif';
    c.fillText(isAr ? scene.title : scene.titleEn, w / 2, 960);

    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(0, h - 250, w, 250);
    c.fillStyle = '#ffffff';
    c.font = 'bold 74px sans-serif';
    c.fillText(isAr ? 'ديلر — كارت خصومات' : 'Deilar — discount card', w / 2, h - 135);
    c.font = '44px sans-serif';
    c.fillText(isAr ? 'حمّل التطبيق وجرّب اللعبة' : 'Download the app and play', w / 2, h - 60);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return null;
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
