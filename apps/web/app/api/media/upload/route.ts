import { uploadMedia } from "@mark-1/integrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxBytes = 25 * 1024 * 1024;

export async function POST(request: Request) {
  if (!hasCloudinaryConfig()) {
    return Response.json({ error: "Cloudinary is not configured" }, { status: 503 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Expected multipart form data with a file field" }, { status: 400 });
  }

  if (file.size > maxBytes) {
    return Response.json({ error: "File is too large. Max upload size is 25MB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const mediaType = mediaTypeFromMime(mimeType);

  try {
    const uploaded = await uploadMedia({
      file: dataUri,
      folder: "mark-1/uploads",
      resourceType: mediaType === "image" ? "image" : mediaType === "video" ? "video" : "raw",
      tags: ["mark-1", "upload", mediaType]
    });

    return Response.json({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      bytes: uploaded.bytes,
      resourceType: uploaded.resource_type,
      mediaType,
      fileName: file.name,
      mimeType
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "upload_failed" }, { status: 502 });
  }
}

function mediaTypeFromMime(mimeType: string): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

function hasCloudinaryConfig() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}
