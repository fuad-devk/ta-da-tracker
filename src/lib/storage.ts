import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { put } from "@vercel/blob";

export type UploadedFile = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_PREFIXES = ["image/", "application/pdf"];

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

export async function uploadReceipt(file: File): Promise<UploadedFile> {
  if (!file || file.size === 0) throw new Error("No file provided");
  if (file.size > MAX_BYTES) throw new Error("File exceeds 10 MB limit");
  if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
    throw new Error("Only images and PDFs are allowed");
  }

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const key = `receipts/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  if (useBlob) {
    const blob = await put(key, file, {
      access: "public",
      contentType: file.type,
    });
    return {
      fileUrl: blob.url,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  }

  // Local dev fallback — write to public/uploads, served by Next as a static file.
  await mkdir(LOCAL_DIR, { recursive: true });
  const localPath = path.join(LOCAL_DIR, path.basename(key));
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(localPath, buf);

  return {
    fileUrl: `/uploads/${path.basename(key)}`,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}
