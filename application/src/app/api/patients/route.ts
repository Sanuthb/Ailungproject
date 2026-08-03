import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/session";

const SORTABLE_FIELDS = ["createdAt", "name", "age"] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

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
    const gender = searchParams.get("gender");
    const sortByParam = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    const sortBy: SortableField = SORTABLE_FIELDS.includes(sortByParam as SortableField)
      ? (sortByParam as SortableField)
      : "createdAt";
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { patientId: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (gender === "Male" || gender === "Female" || gender === "Other") {
      where.gender = gender;
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: { _count: { select: { scans: true } } },
      }),
      db.patient.count({ where }),
    ]);

    return NextResponse.json({
      patients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Patients fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, age, gender, bloodGroup, phone, address, notes } = body;

    if (!name || !age || !gender || !phone || !address) {
      return NextResponse.json(
        { error: "Name, age, gender, phone, and address are required" },
        { status: 400 }
      );
    }

    const patient = await db.patient.create({
      data: { name, age: parseInt(age), gender, bloodGroup, phone, address, notes },
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error("Patient create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
