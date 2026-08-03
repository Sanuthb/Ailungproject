import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";

async function getOrCreateSettings() {
  const existing = await db.settings.findFirst();
  if (existing) return existing;
  return db.settings.create({ data: {} });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOrCreateSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update system settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { hospitalName, hospitalAddress, aiThreshold, doctorSignature, theme, notifications } = body;

    if (aiThreshold !== undefined && (aiThreshold < 0.05 || aiThreshold > 1)) {
      return NextResponse.json(
        { error: "AI threshold must be between 0.05 and 1.0" },
        { status: 400 }
      );
    }

    const current = await getOrCreateSettings();
    const settings = await db.settings.update({
      where: { id: current.id },
      data: {
        ...(hospitalName !== undefined && { hospitalName }),
        ...(hospitalAddress !== undefined && { hospitalAddress }),
        ...(aiThreshold !== undefined && { aiThreshold }),
        ...(doctorSignature !== undefined && { doctorSignature }),
        ...(theme !== undefined && { theme }),
        ...(notifications !== undefined && { notifications }),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
