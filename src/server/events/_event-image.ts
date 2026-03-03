"use server";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const EVENT_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "events");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

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

function normalizeUrlInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalEventImage(imageUrl?: string | null) {
  return Boolean(imageUrl && imageUrl.startsWith("/uploads/events/"));
}

export async function deleteLocalEventImage(imageUrl?: string | null) {
  if (!imageUrl || !isLocalEventImage(imageUrl)) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", imageUrl.replace(/^\/+/, ""));

  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore si le fichier a déjà été supprimé ou n'existe pas
  }
}

export async function saveUploadedEventImage(file: File) {
  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const extension = getExtensionFromMimeType(file.type);

  if (!extension) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  await fs.mkdir(EVENT_UPLOAD_DIR, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const absolutePath = path.join(EVENT_UPLOAD_DIR, fileName);
  const relativeUrl = `/uploads/events/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(absolutePath, buffer);

  return relativeUrl;
}

export async function resolveEventImageInput(
  rawUrlInput: FormDataEntryValue | null,
  rawFileInput: FormDataEntryValue | null,
) {
  let uploadedLocalImageUrl: string | null = null;

  if (rawFileInput instanceof File && rawFileInput.size > 0) {
    uploadedLocalImageUrl = await saveUploadedEventImage(rawFileInput);

    return {
      nextImageUrl: uploadedLocalImageUrl,
      uploadedLocalImageUrl,
    };
  }

  const coverImageUrl = normalizeUrlInput(rawUrlInput);

  if (!coverImageUrl) {
    return {
      nextImageUrl: null,
      uploadedLocalImageUrl: null,
    };
  }

  if (
    coverImageUrl.startsWith("/uploads/events/") ||
    isAbsoluteHttpUrl(coverImageUrl)
  ) {
    return {
      nextImageUrl: coverImageUrl,
      uploadedLocalImageUrl: null,
    };
  }

  throw new Error("INVALID_IMAGE_URL");
}