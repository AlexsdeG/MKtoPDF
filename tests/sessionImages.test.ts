/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
  buildInternalImageUrl,
  parseInternalImageId,
  validateImageFile,
  replaceInternalImageSources,
  serializeImagesForStorage,
  restoreImagesFromStorage,
} from '../lib/sessionImages';

describe('sessionImages helpers', () => {
  it('builds and parses internal image urls', () => {
    const url = buildInternalImageUrl('abc123');
    expect(url).toBe('mkimg://abc123');
    expect(parseInternalImageId(url)).toBe('abc123');
    expect(parseInternalImageId('mkimg:/abc123')).toBe('abc123');
    expect(parseInternalImageId('mkimg:abc123')).toBe('abc123');
    expect(parseInternalImageId('mkimg://abc123/')).toBe('abc123');
    expect(parseInternalImageId('mkimg://abc123?x=1')).toBe('abc123');
    expect(parseInternalImageId('https://example.com/a.png')).toBeNull();
  });

  it('validates allowed mime types and max size', () => {
    const valid = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
    expect(validateImageFile(valid)).toBeNull();

    const invalidType = new File([new Uint8Array(10)], 'a.svg', { type: 'image/svg+xml' });
    expect(validateImageFile(invalidType)).toContain('Unsupported image type');

    const tooLarge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'b.png', { type: 'image/png' });
    expect(validateImageFile(tooLarge)).toContain('Maximum allowed size is 5 MB');
  });

  it('replaces mkimg sources inside html container', () => {
    const container = document.createElement('div');
    container.innerHTML = '<img src="mkimg://img-1" alt="demo" /><img src="https://example.com/keep.png" />';

    const unresolved = replaceInternalImageSources(container, { 'img-1': 'blob:abc' });

    const imgs = container.querySelectorAll('img');
    expect(imgs[0].getAttribute('src')).toBe('blob:abc');
    expect(imgs[1].getAttribute('src')).toBe('https://example.com/keep.png');
    expect(unresolved).toBe(0);
  });

  it('serializes and restores persisted data-url images', () => {
    const images = [
      {
        id: 'img-1',
        name: 'x.png',
        mimeType: 'image/png',
        size: 10,
        createdAt: 1,
        objectUrl: 'data:image/png;base64,AAA',
      },
      {
        id: 'img-2',
        name: 'y.png',
        mimeType: 'image/png',
        size: 10,
        createdAt: 2,
        objectUrl: 'blob:123',
      },
    ];

    const stored = serializeImagesForStorage(images as any);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('img-1');

    const restored = restoreImagesFromStorage(stored);
    expect(restored).toHaveLength(1);
    expect(restored[0].objectUrl.startsWith('data:image/png')).toBe(true);
  });
});
