"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorState } from "@/components/error-state";
import { Brain, ArrowLeft, Trash2, Calendar } from "lucide-react";
import { formatDateTime } from "@/utils/disease";

interface ScanHistoryItem {
  id: string;
  imagePath: string;
  createdAt: string;
  doctor: { name: string };
}

interface PatientDetail {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string | null;
  phone: string;
  address: string;
  notes: string | null;
  scans: ScanHistoryItem[];
}

export default function PatientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<PatientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchPatientDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${resolvedParams.id}`);
      if (!res.ok) throw new Error("Failed to load patient details");
      const json = await res.json();
      setData(json.patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${resolvedParams.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete patient");
      router.push("/dashboard/patients");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete patient");
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton lines={10} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <ErrorState message={error || "Patient not found"} retry={fetchPatientDetails} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients" className="text-slate-500 hover:text-slate-900" aria-label="Back to patients">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <PageHeader title={data.name} description={`Patient ID: ${data.patientId.slice(0, 8)}`} />
        <div className="ml-auto flex gap-3">
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)} className="gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Link href={`/dashboard/predict?patientId=${data.id}`}>
            <Button size="sm" className="gap-2">
              <Brain className="h-4 w-4" /> Run Prediction
            </Button>
          </Link>
        </div>
      </div>

      {deleteError && <Alert variant="danger">{deleteError}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Demographics & Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Age / Gender</span>
              <p className="text-sm font-medium text-slate-900">{data.age} years / {data.gender}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Blood Group</span>
              <p className="text-sm font-medium text-slate-900">{data.bloodGroup || "Not Specified"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Phone</span>
              <p className="text-sm font-medium text-slate-900">{data.phone}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Address</span>
              <p className="text-sm font-medium text-slate-900">{data.address}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes / Medical History</span>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.notes || "No notes available."}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scan & Prediction History</CardTitle>
          </CardHeader>
          <CardContent>
            {data.scans.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-sm text-slate-500">
                <Brain className="mb-2 h-10 w-10 text-slate-300" />
                No scans uploaded for this patient.
              </div>
            ) : (
              <div className="space-y-4">
                {data.scans.map((scan) => (
                  <div key={scan.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
                    <div className="h-16 w-16 overflow-hidden rounded bg-slate-100">
                      <img src={scan.imagePath} alt="Scan preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {formatDateTime(scan.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Doctor: {scan.doctor.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/dashboard/predict?scanId=${scan.id}`}>
                        <Button variant="outline" size="sm">
                          View AI Predictions
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this patient?"
        description="This will permanently delete the patient record along with all associated scans and reports. This action cannot be undone."
        confirmLabel="Delete Patient"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
