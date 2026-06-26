import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';

const MAX_DIMENSION = 400;
const JPEG_QUALITY = 85;

/**
 * Resize and compress an uploaded avatar image to at most 400×400 JPEG.
 * Requires the upload middleware to use memoryStorage so req.file.buffer is set.
 * If no file or buffer is present the middleware is a no-op.
 */
export async function resizeAvatar(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.file?.buffer) {
    next();
    return;
  }
  try {
    req.file.buffer = await sharp(req.file.buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    req.file.mimetype = 'image/jpeg';
    req.file.size = req.file.buffer.length;
  } catch {
    // If sharp fails (e.g. corrupted input), pass through the original buffer.
  }
  next();
}
