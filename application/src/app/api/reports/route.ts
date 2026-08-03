import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";
import { uploadReportPdf } from "@/services/storage";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { scan: { patient: { name: { contains: search, mode: "insensitive" as const } } } },
            { doctor: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [reports, total] = await Promise.all([
      db.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          scan: {
            include: { patient: { select: { name: true, patientId: true } } },
          },
          doctor: { select: { name: true } },
        },
      }),
      db.report.count({ where }),
    ]);

    return NextResponse.json({
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const scanId = formData.get("scanId") as string | null;
    const pdf = formData.get("pdf") as File | null;
    const doctorNotes = (formData.get("doctorNotes") as string | null) ?? "";

    if (!scanId || !pdf) {
      return NextResponse.json({ error: "scanId and pdf are required" }, { status: 400 });
    }

    const scan = await db.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    let pdfPath: string;
    try {
      pdfPath = await uploadReportPdf(pdf, scanId);
    } catch (error) {
      console.error("Report storage upload error:", error);
      const message = error instanceof Error ? error.message : "Failed to store report PDF";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const [report] = await db.$transaction([
      db.report.create({
        data: { scanId, doctorId: user.id, pdfPath },
      }),
      db.scan.update({
        where: { id: scanId },
        data: { report: doctorNotes || null },
      }),
    ]);

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Report create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
