"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { UploadCard } from "@/components/upload-card";
import { HeatmapViewer } from "@/components/heatmap-viewer";
import { PredictionTable } from "@/components/prediction-table";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { generateReportPdf } from "@/services/pdf-report";
import { formatDateTime } from "@/utils/disease";
import { Brain, CheckCircle2, Clock3, Search, User } from "lucide-react";
import type { HospitalSettings, PredictionMap } from "@/types";

interface PatientOption {
  id: string;
  name: string;
  patientId: string;
  age: number;
  gender: string;
  phone: string;
  bloodGroup: string | null;
}

interface ScanResult {
  id: string;
  imagePath: string;
  gradcamImage: string | null;
  noduleMaskImage?: string | null;
  noduleResult?: {
    noduleDetected: boolean;
    maxConfidence: number;
    meanConfidence: number;
    noduleAreaPercentage: number;
  } | null;
  predictions: PredictionMap;
  threshold: number;
  inferenceTime: number;
  recommendations: string[];
  simulated?: boolean;
  createdAt: string | Date;
  existingReportUrl?: string | null;
}

function PredictPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedPatientId = searchParams.get("patientId");
  const viewScanId = searchParams.get("scanId");

  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [doctorName, setDoctorName] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [patientQuery, setPatientQuery] = useState("");
  const debouncedQuery = useDebounce(patientQuery, 350);
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isPredicting, setIsPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoadingScan, setIsLoadingScan] = useState(!!viewScanId);
  const [loadScanError, setLoadScanError] = useState<string | null>(null);

  const [doctorNotes, setDoctorNotes] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setSettings(data));
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setDoctorName(data.user.name));
  }, []);

  // Load an existing scan when viewing results directly (e.g. from patient history).
  useEffect(() => {
    if (!viewScanId) return;
    setIsLoadingScan(true);
    setLoadScanError(null);
    fetch(`/api/scans/${viewScanId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load scan");
        return res.json();
      })
      .then((data) => {
        const scan = data.scan;
        setSelectedPatient({
          id: scan.patient.id,
          name: scan.patient.name,
          patientId: scan.patient.patientId,
          age: scan.patient.age,
          gender: scan.patient.gender,
          phone: scan.patient.phone,
          bloodGroup: scan.patient.bloodGroup,
        });
        setScanResult({
          id: scan.id,
          imagePath: scan.imagePath,
          gradcamImage: scan.gradcamImage,
          noduleMaskImage: scan.noduleMaskImage,
          noduleResult: scan.noduleResult ?? (scan.noduleJson ? JSON.parse(scan.noduleJson) : null),
          predictions: scan.predictions,
          threshold: scan.threshold,
          inferenceTime: 0,
          recommendations: scan.recommendations,
          createdAt: scan.createdAt,
          existingReportUrl: scan.existingReport?.pdfPath ?? null,
        });
        setDoctorNotes(scan.report ?? "");
      })
      .catch((err) => setLoadScanError(err instanceof Error ? err.message : "Failed to load scan"))
      .finally(() => setIsLoadingScan(false));
  }, [viewScanId]);

  // Preselect a patient passed via ?patientId= (e.g. from the patient detail page).
  useEffect(() => {
    if (!preselectedPatientId || viewScanId) return;
    fetch(`/api/patients/${preselectedPatientId}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setSelectedPatient({
          id: data.patient.id,
          name: data.patient.name,
          patientId: data.patient.patientId,
          age: data.patient.age,
          gender: data.patient.gender,
          phone: data.patient.phone,
          bloodGroup: data.patient.bloodGroup,
        });
      })
      .catch(() => {});
  }, [preselectedPatientId, viewScanId]);

  useEffect(() => {
    if (!debouncedQuery || viewScanId) {
      setPatientOptions([]);
      return;
    }
    setIsSearchingPatients(true);
    fetch(`/api/patients?search=${encodeURIComponent(debouncedQuery)}&limit=5`)
      .then((res) => (res.ok ? res.json() : { patients: [] }))
      .then((data) => setPatientOptions(data.patients || []))
      .catch(() => setPatientOptions([]))
      .finally(() => setIsSearchingPatients(false));
  }, [debouncedQuery, viewScanId]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setScanResult(null);
    setReportUrl(null);
  };

  const handleClearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleRunPrediction = async () => {
    if (!file || !selectedPatient) return;
    setIsPredicting(true);
    setPredictError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("patientId", selectedPatient.id);
      const res = await fetch("/api/predict", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI prediction failed");
      setScanResult({
        id: json.scan.id,
        imagePath: json.scan.imagePath,
        gradcamImage: json.scan.gradcamImage,
        noduleMaskImage: json.scan.noduleMaskImage,
        noduleResult: json.scan.noduleResult,
        predictions: json.scan.predictions,
        threshold: json.scan.threshold,
        inferenceTime: json.scan.inferenceTime,
        recommendations: json.scan.recommendations,
        simulated: json.scan.simulated,
        createdAt: json.scan.createdAt,
      });
    } catch (err) {
      setPredictError(err instanceof Error ? err.message : "AI prediction failed");
    } finally {
      setIsPredicting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!scanResult || !selectedPatient || !settings) return;
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const pdfBlob = await generateReportPdf({
        hospitalName: settings.hospitalName,
        doctorSignature: settings.doctorSignature,
        doctorName: doctorName || "Attending Physician",
        patient: selectedPatient,
        imageUrl: scanResult.imagePath,
        gradcam: scanResult.gradcamImage,
        noduleMask: scanResult.noduleMaskImage,
        noduleResult: scanResult.noduleResult,
        predictions: scanResult.predictions,
        threshold: scanResult.threshold,
        inferenceTime: scanResult.inferenceTime,
        scanDate: scanResult.createdAt,
        doctorNotes,
      });

      const formData = new FormData();
      formData.append("scanId", scanResult.id);
      formData.append("pdf", pdfBlob, `report_${selectedPatient.patientId}.pdf`);
      formData.append("doctorNotes", doctorNotes);

      const res = await fetch("/api/reports", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save report");
      setReportUrl(json.report.pdfPath);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const canRunPrediction = useMemo(() => !!file && !!selectedPatient && !isPredicting, [file, selectedPatient, isPredicting]);

  if (isLoadingScan) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Prediction" />
        <LoadingSkeleton lines={10} />
      </div>
    );
  }

  if (loadScanError) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Prediction" />
        <ErrorState message={loadScanError} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Chest X-ray Prediction"
        description="Upload a chest X-ray to run DenseNet121 inference and review AI-assisted findings."
      />

      <Card>
        <CardHeader>
          <CardTitle>Patient</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{selectedPatient.name}</p>
                  <p className="text-xs text-slate-500">
                    {selectedPatient.age}y &middot; {selectedPatient.gender} &middot; ID:{" "}
                    {selectedPatient.patientId.slice(0, 8)}
                  </p>
                </div>
              </div>
              {!viewScanId && (
                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                  Change
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Label htmlFor="patient-search">Search patient by name, ID, or phone</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="patient-search"
                  className="pl-9"
                  placeholder="Start typing to search patients..."
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                />
              </div>
              {showPatientDropdown && debouncedQuery && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                  {isSearchingPatients ? (
                    <div className="p-3 text-sm text-slate-500">Searching...</div>
                  ) : patientOptions.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No patients found.</div>
                  ) : (
                    patientOptions.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowPatientDropdown(false);
                          setPatientQuery("");
                        }}
                      >
                        <span className="font-medium text-slate-900">{patient.name}</span>
                        <span className="text-xs text-slate-500">
                          {patient.age}y &middot; {patient.gender}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Can&apos;t find the patient?{" "}
                <Link href="/dashboard/patients/new" className="font-medium text-blue-600 hover:underline">
                  Add a new patient
                </Link>
                .
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!viewScanId && !scanResult && (
        <Card>
          <CardHeader>
            <CardTitle>Chest X-ray Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadCard
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              disabled={isPredicting}
            />
            {predictError && <Alert variant="danger">{predictError}</Alert>}
            <div className="flex justify-end">
              <Button onClick={handleRunPrediction} disabled={!canRunPrediction} size="lg" className="gap-2">
                <Brain className="h-4 w-4" />
                {isPredicting ? "Analyzing X-ray..." : "Run AI Prediction"}
              </Button>
            </div>
            {isPredicting && <Progress indeterminate label="Running inference on the Hugging Face Space..." />}
          </CardContent>
        </Card>
      )}

      {scanResult && (
        <>
          {scanResult.simulated && (
            <Alert variant="warning">
              HUGGINGFACE_SPACE_URL is not configured, so these are simulated predictions for local
              development. Configure it in your environment to call the real inference Space.
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>AI Findings</CardTitle>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {scanResult.inferenceTime > 0
                    ? `${scanResult.inferenceTime.toFixed(2)}s inference`
                    : formatDateTime(scanResult.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Threshold {Math.round(scanResult.threshold * 100)}%
                </span>
                <Link href={`/dashboard/assistant?scanId=${scanResult.id}`}>
                  <Button variant="outline" size="sm">
                    Ask AI about this scan
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <HeatmapViewer
                originalSrc={scanResult.imagePath}
                gradcamSrc={scanResult.gradcamImage}
                noduleMaskSrc={scanResult.noduleMaskImage}
              />

              {scanResult.noduleResult && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-600" />
                      U-Net Lung Nodule Segmentation Assessment
                    </h4>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        scanResult.noduleResult.noduleDetected
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {scanResult.noduleResult.noduleDetected
                        ? "Nodule Detected"
                        : "No Nodule Detected"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-lg border border-purple-100 bg-white p-3 shadow-sm">
                      <span className="text-slate-500 font-medium">Nodule Presence</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {scanResult.noduleResult.noduleDetected ? "Positive" : "Clear / Negative"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-purple-100 bg-white p-3 shadow-sm">
                      <span className="text-slate-500 font-medium">Peak Detection Score</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {Math.round((scanResult.noduleResult.maxConfidence || 0) * 100)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-purple-100 bg-white p-3 shadow-sm">
                      <span className="text-slate-500 font-medium">Nodule Area Percentage</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {scanResult.noduleResult.noduleAreaPercentage || 0}% of lung field
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <PredictionTable predictions={scanResult.predictions} threshold={scanResult.threshold} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                {scanResult.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate AI Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="doctor-notes">Doctor&apos;s Notes (optional)</Label>
                <Textarea
                  id="doctor-notes"
                  rows={4}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Add any additional clinical observations to include in the report..."
                />
              </div>

              {reportError && <Alert variant="danger">{reportError}</Alert>}

              {reportUrl || scanResult.existingReportUrl ? (
                <Alert variant="success">
                  Report ready.{" "}
                  <Link
                    href={reportUrl || scanResult.existingReportUrl || "#"}
                    target="_blank"
                    className="font-medium underline"
                  >
                    View / download PDF
                  </Link>
                </Alert>
              ) : (
                <div className="flex justify-end">
                  <Button onClick={handleGenerateReport} disabled={isGeneratingReport} className="gap-2">
                    {isGeneratingReport ? "Generating PDF..." : "Generate Report"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {!viewScanId && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setScanResult(null);
                  handleClearFile();
                  setDoctorNotes("");
                  setReportUrl(null);
                  router.push(selectedPatient ? `/dashboard/predict?patientId=${selectedPatient.id}` : "/dashboard/predict");
                }}
              >
                Run Another Prediction
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PredictPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={10} />}>
      <PredictPageContent />
    </Suspense>
  );
}
