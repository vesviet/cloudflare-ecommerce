const SAFE_EXTENSION = /^[a-z0-9]{1,10}$/;

/**
 * Builds a URL-safe, collision-resistant R2 object key from an uploaded file name.
 * Raw file names may contain spaces, '#' or '?', which break the media URL that
 * is stored alongside the product.
 */
export const buildUploadKey = (originalName: string): string => {
  const dotIndex = originalName.lastIndexOf('.');
  const rawExtension = dotIndex > -1 ? originalName.slice(dotIndex + 1).toLowerCase() : '';
  const extension = SAFE_EXTENSION.test(rawExtension) ? rawExtension : 'bin';

  const rawBase = dotIndex > -1 ? originalName.slice(0, dotIndex) : originalName;
  const base = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';

  return `${base}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
};
