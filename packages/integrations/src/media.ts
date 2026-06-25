import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type UploadMediaInput = {
  file: string;
  folder?: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
  tags?: string[];
};

export function getCloudinaryConfig(env = process.env): CloudinaryConfig {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary config requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET");
  }

  return { cloudName, apiKey, apiSecret };
}

export function configureCloudinary(config = getCloudinaryConfig()) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true
  });

  return cloudinary;
}

export async function uploadMedia(input: UploadMediaInput): Promise<UploadApiResponse> {
  const client = configureCloudinary();
  const options: UploadApiOptions = {
    folder: input.folder ?? "mark-1",
    public_id: input.publicId,
    resource_type: input.resourceType ?? "auto",
    tags: input.tags
  };

  return client.uploader.upload(input.file, options);
}

export async function deleteMedia(publicId: string, resourceType: UploadMediaInput["resourceType"] = "image") {
  const client = configureCloudinary();
  return client.uploader.destroy(publicId, { resource_type: resourceType });
}
