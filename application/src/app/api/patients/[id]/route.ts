import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        scans: {
          orderBy: { createdAt: "desc" },
          include: { doctor: { select: { name: true } } },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Patient fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, age, gender, bloodGroup, phone, address, notes } = body;

    const patient = await db.patient.update({
      where: { id },
      data: { name, age: parseInt(age), gender, bloodGroup, phone, address, notes },
    });

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Patient update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    await db.patient.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Patient delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
