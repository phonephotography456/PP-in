import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_PIXELS = 40_000_000; // ~40 MP: blocks decompression bombs
const MAX_EDGE = 2400;

export class ImageRejected extends Error {}

/**
 * Validates by decoding the actual bytes (not the file name or MIME type), then re-encodes to WebP:
 * strips metadata/EXIF location, applies orientation, caps the size, and discards any payload hidden in the original.
 */
export async function processImage(input: Buffer) {
  if (input.length === 0) throw new ImageRejected("The file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageRejected("Image is larger than 5 MB.");
  try {
    const src = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" });
    const meta = await src.metadata();
    if (!meta.format || !FORMATS.has(meta.format)) throw new ImageRejected("Only JPEG, PNG and WebP images are allowed.");
    if (!meta.width || !meta.height) throw new ImageRejected("Could not read the image.");
    return await src
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (e) {
    if (e instanceof ImageRejected) throw e;
    throw new ImageRejected("This file is not a valid JPEG, PNG or WebP image.");
  }
}
