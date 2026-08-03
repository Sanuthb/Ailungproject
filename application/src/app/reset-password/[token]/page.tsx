"use client";

import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Stethoscope } from "lucide-react";

const resetPasswordSchema = zod
  .object({
    password: zod.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: zod.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = zod.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset password");
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <Stethoscope className="h-10 w-10 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Set a new password</h2>
          <p className="text-center text-sm text-slate-500">
            Choose a strong password you haven&apos;t used before.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-green-50 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <p className="text-sm text-green-800">
              Password updated successfully. Redirecting you to login...
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="sr-only">New password</label>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="New password"
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="sr-only">Confirm new password</label>
                <Input
                  {...register("confirmPassword")}
                  type="password"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
