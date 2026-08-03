import { randomUUID } from "node:crypto";
import { STORAGE_BUCKET, getSupabaseAdmin } from "@/lib/supabase";

async function uploadBuffer(path: string, buffer: Buffer, contentType: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload ${path} to Supabase Storage: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.]/g, "_");
}

/** Uploads an uploaded chest X-ray image and returns its public URL. */
export async function uploadScanImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `scans/${Date.now()}_${randomUUID()}_${safeFilename(file.name)}`;
  return uploadBuffer(path, buffer, file.type || "image/jpeg");
}

/** Uploads a base64-encoded Grad-CAM overlay (as returned by the inference Space) and returns its public URL. */
export async function uploadGradcamImage(base64Image: string): Promise<string> {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const path = `gradcam/${Date.now()}_${randomUUID()}.png`;
  return uploadBuffer(path, buffer, "image/png");
}

/** Uploads a base64-encoded U-Net Nodule Mask overlay and returns its public URL. */
export async function uploadNoduleMaskImage(base64Image: string): Promise<string> {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  const path = `nodule_masks/${Date.now()}_${randomUUID()}.png`;
  return uploadBuffer(path, buffer, "image/png");
}

/** Uploads a generated report PDF and returns its public URL. */
export async function uploadReportPdf(pdf: File, scanId: string): Promise<string> {
  const buffer = Buffer.from(await pdf.arrayBuffer());
  const path = `reports/${Date.now()}_${scanId}.pdf`;
  return uploadBuffer(path, buffer, "application/pdf");
}
