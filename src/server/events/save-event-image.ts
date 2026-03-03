import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

function getExtensionFromMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export async function saveEventImage(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const extension = getExtensionFromMimeType(file.type);

  if (!extension) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const relativePath = `/uploads/events/${fileName}`;
  const absolutePath = path.join(process.cwd(), "public", "uploads", "events", fileName);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return relativePath;
}

export async function deleteEventImage(imageUrl?: string | null) {
  if (!imageUrl) return;

  if (!imageUrl.startsWith("/uploads/events/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", imageUrl.replace(/^\/+/, ""));

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore si le fichier n'existe déjà plus
  }
}