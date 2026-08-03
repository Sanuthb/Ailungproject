import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";
import { getRecommendations } from "@/utils/disease";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const scan = await db.scan.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { select: { name: true } },
        reports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const settings = await db.settings.findFirst();
    const threshold = settings?.aiThreshold ?? 0.5;
    const predictions = JSON.parse(scan.predictionJson);
    const noduleResult = scan.noduleJson ? JSON.parse(scan.noduleJson) : null;

    return NextResponse.json({
      scan: {
        ...scan,
        predictions,
        noduleResult,
        threshold,
        recommendations: getRecommendations(predictions, threshold),
        existingReport: scan.reports[0] ?? null,
      },
    });
  } catch (error) {
    console.error("Scan fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
