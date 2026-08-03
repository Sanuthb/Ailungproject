import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });

    // Always respond with a generic success message so this endpoint can't be
    // used to enumerate registered email addresses.
    if (user) {
      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await db.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiresAt },
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

      // No transactional email provider is configured for this project yet.
      // Log the link so it can be used during development and demos.
      console.info(`[password reset] ${email} -> ${resetUrl}`);
    }

    return NextResponse.json({
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
