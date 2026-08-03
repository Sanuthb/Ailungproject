import { UserRole } from "@prisma/client";

export interface UserSession {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

export type Severity = "Normal" | "Mild" | "Moderate" | "Severe";

/** The 14 CheXpert Small labels the DenseNet121 model was trained on, in output order. */
export const DISEASE_LABELS = [
  "No Finding",
  "Enlarged Cardiomediastinum",
  "Cardiomegaly",
  "Lung Opacity",
  "Lung Lesion",
  "Edema",
  "Consolidation",
  "Pneumonia",
  "Atelectasis",
  "Pneumothorax",
  "Pleural Effusion",
  "Pleural Other",
  "Fracture",
  "Support Devices",
] as const;

export type DiseaseLabel = (typeof DISEASE_LABELS)[number];

export type PredictionMap = Record<string, number>;

/** Structured response returned by the Hugging Face inference Space. */
export interface HuggingFacePredictionResponse {
  predictions: { disease: string; confidence: number }[];
  gradcam: string;
  inference_time: number;
}

export interface PredictionResult {
  predictions: PredictionMap;
  gradcam: string | null;
  inferenceTime: number;
  simulated: boolean;
}

export interface PatientSummary {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
}

export interface UNetPredictionResponse {
  nodule_detected: boolean;
  max_confidence: number;
  mean_confidence: number;
  nodule_area_percentage: number;
  nodule_mask_overlay: string | null;
  inference_time: number;
}

export interface UNetPredictionResult {
  noduleDetected: boolean;
  maxConfidence: number;
  meanConfidence: number;
  noduleAreaPercentage: number;
  noduleMaskOverlay: string | null;
  inferenceTime: number;
  simulated: boolean;
}

export interface ScanWithPredictions {
  id: string;
  patientId: string;
  doctorId: number;
  imagePath: string;
  gradcamImage: string | null;
  noduleMaskImage?: string | null;
  predictionJson: string;
  noduleJson?: string | null;
  report: string | null;
  createdAt: string | Date;
  patient?: PatientSummary;
  doctor?: { name: string };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HospitalSettings {
  id: number;
  hospitalName: string;
  hospitalAddress: string | null;
  aiThreshold: number;
  doctorSignature: string;
  theme: string;
  notifications: boolean;
}
