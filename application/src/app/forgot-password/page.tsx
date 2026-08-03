"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MailCheck, Stethoscope } from "lucide-react";

const forgotPasswordSchema = zod.object({
  email: zod.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = zod.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Something went wrong");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <Stethoscope className="h-10 w-10 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Reset your password</h2>
          <p className="text-center text-sm text-slate-500">
            Enter the email associated with your account and we&apos;ll send you a link to reset
            your password.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 rounded-lg bg-green-50 p-6 text-center">
            <MailCheck className="h-8 w-8 text-green-600" />
            <p className="text-sm text-green-800">
              If an account exists for that email, a password reset link has been sent.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="sr-only">Email address</label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-slate-500">
          Remember your password?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
