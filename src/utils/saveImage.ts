import { Capacitor, registerPlugin } from '@capacitor/core';

const GallerySaver = registerPlugin<{ save(options: { data: string; filename: string }): Promise<{ path: string }> }>('GallerySaver');

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Saves a PNG for the member. In the app it goes to the phone's gallery (Pictures/Deilar) — a WebView cannot save a
 * blob through `<a download>`, it only shows a notification. In a browser it is an ordinary download.
 */
export async function saveImage(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await GallerySaver.save({ data: await toBase64(blob), filename });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
