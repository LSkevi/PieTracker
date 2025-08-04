import sharp from 'sharp';

export async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .grayscale()
    .toBuffer();
}