import { describe, it, expect } from 'vitest';
import { buildUploadKey } from '../uploadKey';

describe('buildUploadKey', () => {
  it('produces a URL-safe key from a name with spaces and reserved characters', () => {
    const key = buildUploadKey('My Photo #1?.JPG');

    expect(key).toMatch(/^my-photo-1-[0-9a-f]{8}\.jpg$/);
    expect(key).toBe(encodeURIComponent(key));
  });

  it('keeps the extension lowercase and rejects an implausible extension', () => {
    expect(buildUploadKey('banner.PNG')).toMatch(/\.png$/);
    expect(buildUploadKey('archive.tar.gz')).toMatch(/\.gz$/);
    expect(buildUploadKey('weird.thisisnotanextension')).toMatch(/\.bin$/);
  });

  it('falls back to a base name when the original has no usable characters', () => {
    expect(buildUploadKey('___.jpg')).toMatch(/^image-[0-9a-f]{8}\.jpg$/);
    expect(buildUploadKey('.jpg')).toMatch(/^image-[0-9a-f]{8}\.jpg$/);
  });

  it('never emits path separators, so the object key stays flat', () => {
    const key = buildUploadKey('../../escape/attempt.jpg');

    expect(key).not.toContain('/');
    expect(key).not.toContain('..');
  });

  it('does not collide for repeated uploads of the same name', () => {
    const keys = new Set(Array.from({ length: 50 }, () => buildUploadKey('same.jpg')));

    expect(keys.size).toBe(50);
  });

  it('caps the base name length', () => {
    const key = buildUploadKey(`${'a'.repeat(200)}.jpg`);

    expect(key.length).toBeLessThanOrEqual(60 + 1 + 8 + 4);
  });
});
