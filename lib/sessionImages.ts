export const INTERNAL_IMAGE_PREFIX = 'mkimg://';
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

export interface SessionImageAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  objectUrl: string;
}

export interface StoredImageAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  dataUrl: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode image to data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function buildInternalImageUrl(id: string): string {
  return `${INTERNAL_IMAGE_PREFIX}${id}`;
}

export function parseInternalImageId(url: string): string | null {
  if (!url) return null;

  let rawId = '';
  if (url.startsWith(INTERNAL_IMAGE_PREFIX)) {
    rawId = url.slice(INTERNAL_IMAGE_PREFIX.length);
  } else if (url.startsWith('mkimg:/')) {
    rawId = url.slice('mkimg:/'.length);
  } else if (url.startsWith('mkimg:')) {
    rawId = url.slice('mkimg:'.length);
  } else {
    return null;
  }

  // Normalization handles browser/parser URL canonicalization differences.
  const withoutQueryHash = rawId.split('#')[0].split('?')[0];
  const normalized = decodeURIComponent(withoutQueryHash)
    .replace(/^\/\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .trim();

  return normalized || null;
}

function getInternalImageIdFromElement(img: HTMLImageElement): string | null {
  const attrSrc = img.getAttribute('src') || '';
  const fromAttr = parseInternalImageId(attrSrc);
  if (fromAttr) return fromAttr;

  return parseInternalImageId(img.src || '');
}

export function validateImageFile(file: File): string | null {
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(file.type)) {
    return 'Unsupported image type. Use PNG, JPEG, WebP, or GIF.';
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'Image is too large. Maximum allowed size is 5 MB.';
  }
  return null;
}

export async function createSessionImageAsset(file: File): Promise<SessionImageAsset> {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const dataUrl = await fileToDataUrl(file);

  return {
    id,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    createdAt: Date.now(),
    objectUrl: dataUrl,
  };
}

export function serializeImagesForStorage(images: SessionImageAsset[]): StoredImageAsset[] {
  return images
    .filter((img) => img.objectUrl.startsWith('data:'))
    .map((img) => ({
      id: img.id,
      name: img.name,
      mimeType: img.mimeType,
      size: img.size,
      createdAt: img.createdAt,
      dataUrl: img.objectUrl,
    }));
}

export function restoreImagesFromStorage(images: StoredImageAsset[]): SessionImageAsset[] {
  return images
    .filter((img) => typeof img.dataUrl === 'string' && img.dataUrl.startsWith('data:'))
    .map((img) => ({
      id: img.id,
      name: img.name,
      mimeType: img.mimeType,
      size: img.size,
      createdAt: img.createdAt,
      objectUrl: img.dataUrl,
    }));
}

export function replaceInternalImageSources(
  container: HTMLElement,
  imageSourceMap: Record<string, string>
): number {
  const imageEls = container.querySelectorAll('img');
  let unresolvedCount = 0;

  imageEls.forEach((img) => {
    const internalId = getInternalImageIdFromElement(img);
    if (!internalId) return;

    const resolved = imageSourceMap[internalId];
    if (resolved) {
      img.setAttribute('src', resolved);
      return;
    }

    unresolvedCount += 1;
    img.setAttribute('alt', `${img.getAttribute('alt') || 'Image'} (not found in current session)`);
    img.style.opacity = '0.5';
    img.style.border = '1px dashed #ef4444';
  });

  return unresolvedCount;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL.'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob.'));
    reader.readAsDataURL(blob);
  });
}

async function sourceToDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

export async function inlineImageSourcesForExport(
  container: HTMLElement,
  imageSourceMap: Record<string, string>
): Promise<void> {
  const imageEls = Array.from(container.querySelectorAll('img'));

  for (const img of imageEls) {
    const rawSrc = img.getAttribute('src') || img.src || '';
    const internalId = getInternalImageIdFromElement(img);
    const src = internalId ? imageSourceMap[internalId] : rawSrc;

    if (!src) continue;

    // Already a data URL — write it back so mkimg:// src is replaced before printing.
    if (src.startsWith('data:')) {
      img.setAttribute('src', src);
      continue;
    }

    if (internalId && !imageSourceMap[internalId]) {
      continue;
    }

    try {
      if (src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
        const dataUrl = await sourceToDataUrl(src);
        img.setAttribute('src', dataUrl);
      }
    } catch {
      // Keep the original src if conversion fails.
    }
  }
}