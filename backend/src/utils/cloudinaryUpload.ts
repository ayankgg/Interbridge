import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { env } from '../config/env';

interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'raw' | 'auto';
  publicId?: string;
}

export function uploadBuffer(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  const { folder = env.cloudinary.folder, resourceType = 'auto', publicId } = options;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, public_id: publicId, overwrite: true },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export async function deleteAsset(publicId: string, resourceType: 'image' | 'raw' = 'raw'): Promise<void> {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
