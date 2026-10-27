import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";
import { chatCompletion } from "@/services/groq";

const bodySchema = z.object({
  scanId: z.string().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(20),
});

const BASE_PROMPT = `You are a clinical decision-support assistant inside an AI chest X-ray diagnostics app used by doctors.
- Explain findings, confidence scores, Grad-CAM heatmaps and nodule segmentation in clear, concise language.
- You support the doctor; you do not replace them. Never give a definitive diagnosis, and remind the user that AI output must be confirmed by a qualified radiologist when relevant.
- If asked something unrelated to medicine or this application, politely decline.
- If the data needed to answer is not provided, say so instead of guessing.`;

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { scanId, messages } = parsed.data;

    let system = BASE_PROMPT;

    if (scanId) {
      const scan = await db.scan.findUnique({
        where: { id: scanId },
        include: { patient: { select: { age: true, gender: true } } },
      });
      if (!scan) {
        return NextResponse.json({ error: "Scan not found" }, { status: 404 });
      }

      const settings = await db.settings.findFirst();
      const threshold = settings?.aiThreshold ?? 0.5;
      const predictions = JSON.parse(scan.predictionJson) as Record<string, number>;
      const ranked = Object.entries(predictions)
        .sort((a, b) => b[1] - a[1])
        .map(([label, p]) => `${label}: ${(p * 100).toFixed(1)}%`)
        .join("\n");

      // Only age and gender are shared; name, phone and address never leave the server.
      system += `\n\nCurrent scan context (patient: ${scan.patient.age}y, ${scan.patient.gender}):
Detection threshold: ${(threshold * 100).toFixed(0)}%
DenseNet121 probabilities:\n${ranked}`;
      if (scan.noduleJson) {
        const n = JSON.parse(scan.noduleJson);
        system += `\nU-Net nodule segmentation: ${n.noduleDetected ? "nodule detected" : "no nodule detected"}, max confidence ${(n.maxConfidence * 100).toFixed(1)}%, area ${Number(n.noduleAreaPercentage).toFixed(2)}% of the image.`;
      }
    }

    const reply = await chatCompletion(system, messages);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Assistant error:", error);
    const message = error instanceof Error ? error.message : "Assistant request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
