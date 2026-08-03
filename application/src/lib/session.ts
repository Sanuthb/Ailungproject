import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import type { UserRole } from "@prisma/client";
import type { UserSession } from "@/types";

function toUserSession(payload: Record<string, unknown>): UserSession {
  return {
    id: payload.id as number,
    email: payload.email as string,
    role: payload.role as UserRole,
    name: payload.name as string,
  };
}

/** Reads and verifies the auth cookie from a Server Component / layout. Returns null if absent or invalid. */
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return toUserSession(payload);
}

/** Reads and verifies the auth cookie from within a Route Handler. Returns null if absent or invalid. */
export async function getSessionFromRequest(request: NextRequest): Promise<UserSession | null> {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return toUserSession(payload);
}
