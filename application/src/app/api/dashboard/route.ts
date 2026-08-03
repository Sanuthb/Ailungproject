import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalPatients, todayScans, totalReports, totalScans, settings] = await Promise.all([
      db.patient.count(),
      db.scan.count({ where: { createdAt: { gte: today }, doctorId: user.id } }),
      db.report.count(),
      db.scan.count(),
      db.settings.findFirst(),
    ]);
    const threshold = settings?.aiThreshold ?? 0.5;

    const recentScans = await db.scan.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { name: true, patientId: true } },
        doctor: { select: { name: true } },
        reports: { select: { id: true }, take: 1 },
      },
    });

    const diseaseDistribution = await db.scan.findMany({
      select: { predictionJson: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    const diseaseCounts: Record<string, number> = {};
    diseaseDistribution.forEach((scan) => {
      try {
        const predictions = JSON.parse(scan.predictionJson);
        Object.entries(predictions).forEach(([disease, prob]) => {
          if ((prob as number) >= threshold) {
            diseaseCounts[disease] = (diseaseCounts[disease] || 0) + 1;
          }
        });
      } catch {}
    });

    return NextResponse.json({
      stats: { totalPatients, todayScans, totalReports, totalScans },
      recentScans,
      diseaseDistribution: Object.entries(diseaseCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
