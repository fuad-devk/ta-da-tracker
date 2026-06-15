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

export type UploadOptions = {
  folder: "receipts" | "branding";
  maxBytes?: number;
  allowedPrefixes?: string[];
};

const DEFAULTS_BY_FOLDER: Record<UploadOptions["folder"], Required<Omit<UploadOptions, "folder">>> = {
  receipts: {
    maxBytes: 10 * 1024 * 1024, // 10 MB
    allowedPrefixes: ["image/", "application/pdf"],
  },
  branding: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    allowedPrefixes: ["image/"],
  },
};

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function uploadFile(file: File, opts: UploadOptions): Promise<UploadedFile> {
  if (!file || file.size === 0) throw new Error("No file provided");
  const def = DEFAULTS_BY_FOLDER[opts.folder];
  const maxBytes = opts.maxBytes ?? def.maxBytes;
  const allowed = opts.allowedPrefixes ?? def.allowedPrefixes;

  if (file.size > maxBytes) {
    throw new Error(`File exceeds ${Math.round(maxBytes / 1024 / 1024)} MB limit`);
  }
  if (!allowed.some((p) => file.type.startsWith(p))) {
    throw new Error(`File type ${file.type || "unknown"} is not allowed`);
  }

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const key = `${opts.folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  if (useBlob) {
    const blob = await put(key, file, {
      access: "public",
      contentType: file.type,
      // Avoid name collision when uploading from multiple sessions
      addRandomSuffix: false,
    });
    return {
      fileUrl: blob.url,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  }

  const localDir = path.join(process.cwd(), "public", opts.folder);
  await mkdir(localDir, { recursive: true });
  const localPath = path.join(localDir, path.basename(key));
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(localPath, buf);

  return {
    fileUrl: `/${opts.folder}/${path.basename(key)}`,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

// Back-compat wrapper used by receipts code.
export async function uploadReceipt(file: File): Promise<UploadedFile> {
  return uploadFile(file, { folder: "receipts" });
}
