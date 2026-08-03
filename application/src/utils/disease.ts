import type { PredictionMap, Severity } from "@/types";

export function getSeverity(probability: number): Severity {
  if (probability < 0.3) return "Normal";
  if (probability < 0.5) return "Mild";
  if (probability < 0.7) return "Moderate";
  return "Severe";
}

/**
 * Clinical follow-up notes per finding. Advisory only — never a diagnosis.
 * Keep in sync with the disclaimer shown on the AI report.
 */
const FINDING_NOTES: Record<string, string> = {
  Cardiomegaly: "Further cardiac evaluation recommended. Consider echocardiography.",
  "Lung Opacity": "Clinical correlation advised. Consider CT chest for further evaluation.",
  Consolidation: "Clinical correlation advised. Consider CT chest for further evaluation.",
  Pneumothorax: "Urgent clinical evaluation required. Consider chest tube insertion if symptomatic.",
  Pneumonia: "Correlate with clinical signs and consider antimicrobial workup.",
  Edema: "Assess for cardiac or renal etiology. Consider BNP and clinical exam.",
  "Pleural Effusion": "Consider ultrasound-guided thoracentesis if clinically indicated.",
  Atelectasis: "Encourage incentive spirometry and reassess on follow-up imaging.",
  Fracture: "Recommend orthopedic consultation and correlation with clinical trauma history.",
  "Enlarged Cardiomediastinum": "Consider further cardiac and mediastinal imaging.",
  "Lung Lesion": "Recommend CT chest for further characterization of the lesion.",
  "Pleural Other": "Further pleural imaging or specialist referral advised.",
  "Support Devices": "Confirm correct placement of visualized support device(s).",
};

export function getRecommendations(predictions: PredictionMap, threshold = 0.5): string[] {
  const positiveFindings = Object.entries(predictions)
    .filter(([disease, probability]) => probability >= threshold && disease !== "No Finding")
    .sort(([, a], [, b]) => b - a);

  if (positiveFindings.length === 0) {
    return ["No significant abnormalities detected. Routine follow-up recommended."];
  }

  return positiveFindings.map(
    ([disease]) => FINDING_NOTES[disease] ?? `Further clinical correlation advised for ${disease}.`
  );
}

export function getTopFindings(predictions: PredictionMap, threshold = 0.5) {
  return Object.entries(predictions)
    .filter(([disease, probability]) => probability >= threshold && disease !== "No Finding")
    .sort(([, a], [, b]) => b - a)
    .map(([disease, probability]) => ({ disease, probability }));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
