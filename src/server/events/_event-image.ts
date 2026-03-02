import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function getSafeExtension(filename: string) {
  const ext = path.extname(filename || "").toLowerCase();
  if (!ext || ext.length > 8) return ".png";
  return ext;
}

export async function resolveEventImageInput(
  coverImageUrlRaw: FormDataEntryValue | null,
  coverImageFileRaw: FormDataEntryValue | null,
) {
  const coverImageUrl =
    typeof coverImageUrlRaw === "string" ? coverImageUrlRaw.trim() : "";

  const file =
    coverImageFileRaw instanceof File && coverImageFileRaw.size > 0
      ? coverImageFileRaw
      : null;

  if (file) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = getSafeExtension(file.name);
    const filename = `event-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "events");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, bytes);

    return `/uploads/events/${filename}`;
  }

  return coverImageUrl || null;
}