const PORTRAIT_MAX_WIDTH = 900;
const PORTRAIT_MAX_HEIGHT = 1200;
const PORTRAIT_QUALITY = 0.9;

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Portrait image failed to load."));
    image.src = dataUrl;
  });
}

export async function decodeImageDataUrl(dataUrl: string) {
  const image = await loadImage(dataUrl);
  if (typeof image.decode === "function") {
    await image.decode().catch(() => undefined);
  }
}

export async function normalizePortraitDataUrl(dataUrl: string, mimeType: string) {
  try {
    const image = await loadImage(dataUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, PORTRAIT_MAX_WIDTH / width, PORTRAIT_MAX_HEIGHT / height);

    if (scale >= 1) {
      return dataUrl;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      return dataUrl;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (mimeType === "image/jpeg" || mimeType === "image/webp") {
      return canvas.toDataURL(mimeType, PORTRAIT_QUALITY);
    }

    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}
