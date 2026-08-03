import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";
import { runInference } from "@/services/huggingface";
import { runUNetInference } from "@/services/unet";
import { uploadGradcamImage, uploadNoduleMaskImage, uploadScanImage } from "@/services/storage";
import { getRecommendations } from "@/utils/disease";

const VALID_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const patientId = formData.get("patientId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, and JPEG formats are supported" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be less than 20 MB" }, { status: 400 });
    }

    const patient = await db.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const settings = await db.settings.findFirst();
    const threshold = settings?.aiThreshold ?? 0.5;

    let denseNetInference;
    let unetInference;
    try {
      [denseNetInference, unetInference] = await Promise.all([
        runInference(file),
        runUNetInference(file),
      ]);
    } catch (error) {
      console.error("AI inference error:", error);
      const message = error instanceof Error ? error.message : "AI prediction failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    let imagePath: string;
    let gradcamUrl: string | null = null;
    let noduleMaskUrl: string | null = null;
    try {
      [imagePath, gradcamUrl, noduleMaskUrl] = await Promise.all([
        uploadScanImage(file),
        denseNetInference.gradcam ? uploadGradcamImage(denseNetInference.gradcam) : Promise.resolve(null),
        unetInference.noduleMaskOverlay ? uploadNoduleMaskImage(unetInference.noduleMaskOverlay) : Promise.resolve(null),
      ]);
    } catch (error) {
      console.error("Storage upload error:", error);
      const message = error instanceof Error ? error.message : "Failed to store scan files";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const scan = await db.scan.create({
      data: {
        patientId,
        doctorId: user.id,
        imagePath,
        gradcamImage: gradcamUrl,
        noduleMaskImage: noduleMaskUrl,
        predictionJson: JSON.stringify(denseNetInference.predictions),
        noduleJson: JSON.stringify(unetInference),
      },
    });

    return NextResponse.json(
      {
        scan: {
          ...scan,
          predictions: denseNetInference.predictions,
          noduleResult: unetInference,
          inferenceTime: denseNetInference.inferenceTime + unetInference.inferenceTime,
          simulated: denseNetInference.simulated || unetInference.simulated,
          threshold,
          recommendations: getRecommendations(denseNetInference.predictions, threshold),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Prediction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
