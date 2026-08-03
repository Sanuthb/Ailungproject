"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";

const patientSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters"),
  age: zod.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Age must be a positive number",
  }),
  gender: zod.enum(["Male", "Female", "Other"], {
    message: "Please select a valid gender",
  }),
  bloodGroup: zod.string().optional(),
  phone: zod.string().min(10, "Phone number must be at least 10 digits"),
  address: zod.string().min(5, "Address must be at least 5 characters"),
  notes: zod.string().optional(),
});

type PatientFormValues = zod.infer<typeof patientSchema>;

export default function NewPatientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      age: "",
      gender: "Male",
      bloodGroup: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  const onSubmit = async (data: PatientFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create patient");
      router.push(`/dashboard/patients/${json.patient.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Add New Patient"
        description="Register a new patient to run AI Chest X-ray predictions and generate reports."
      />

      <Card>
        <CardContent className="p-6">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <Input {...register("name")} className="mt-1" />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Age</label>
                <Input {...register("age")} type="number" className="mt-1" />
                {errors.age && <p className="mt-1 text-xs text-red-600">{errors.age.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Gender</label>
                <select
                  {...register("gender")}
                  className="mt-1 block h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Blood Group</label>
                <Input {...register("bloodGroup")} className="mt-1" />
                {errors.bloodGroup && <p className="mt-1 text-xs text-red-600">{errors.bloodGroup.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                <Input {...register("phone")} className="mt-1" />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Address</label>
                <Input {...register("address")} className="mt-1" />
                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Notes (Medical History)</label>
                <Textarea {...register("notes")} className="mt-1" />
                {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Patient"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
