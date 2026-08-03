import { jsPDF } from "jspdf";
import { DISEASE_LABELS } from "@/types";
import type { PredictionMap } from "@/types";
import { formatDateTime, getRecommendations, getSeverity } from "@/utils/disease";

export interface ReportPdfInput {
  hospitalName: string;
  doctorSignature: string;
  doctorName: string;
  patient: {
    name: string;
    patientId: string;
    age: number;
    gender: string;
    bloodGroup?: string | null;
    phone: string;
  };
  imageUrl: string;
  gradcam?: string | null;
  noduleMask?: string | null;
  noduleResult?: {
    noduleDetected: boolean;
    maxConfidence: number;
    meanConfidence: number;
    noduleAreaPercentage: number;
  } | null;
  predictions: PredictionMap;
  threshold: number;
  inferenceTime: number;
  scanDate: string | Date;
  doctorNotes?: string;
}

const DISCLAIMER =
  "This report was generated with assistance from an AI decision-support system (DenseNet121, trained on the CheXpert Small dataset). " +
  "It is intended to assist, not replace, clinical judgment. All findings must be reviewed and confirmed by a qualified radiologist or physician before any diagnostic or treatment decision is made.";

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = loaded.naturalWidth;
    canvas.height = loaded.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(loaded, 0, 0);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

export async function generateReportPdf(input: ReportPdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(input.hospitalName, margin, y);
  y += 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Assisted Chest X-Ray Diagnostic Report", margin, y);
  doc.text(formatDateTime(input.scanDate), pageWidth - margin, y, { align: "right" });
  y += 8;
  doc.setDrawColor(210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Information", margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const patientLines = [
    `Name: ${input.patient.name}`,
    `Patient ID: ${input.patient.patientId}`,
    `Age / Gender: ${input.patient.age} / ${input.patient.gender}`,
    `Blood Group: ${input.patient.bloodGroup || "Not specified"}`,
    `Phone: ${input.patient.phone}`,
  ];
  patientLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 14;
  });
  y += 10;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Chest X-Ray Imaging", margin, y);
  y += 14;

  const imageWidth = (pageWidth - margin * 2 - 20) / 2;
  const [original, gradcam] = await Promise.all([
    loadImageAsDataUrl(input.imageUrl),
    input.gradcam ? Promise.resolve({ dataUrl: input.gradcam, width: 1, height: 1 }) : Promise.resolve(null),
  ]);

  const imageTop = y;
  let imageBottom = y;
  if (original) {
    const h = (imageWidth * original.height) / original.width;
    doc.addImage(original.dataUrl, "JPEG", margin, imageTop, imageWidth, h);
    doc.setFontSize(9);
    doc.text("Original X-ray", margin, imageTop + h + 12);
    imageBottom = Math.max(imageBottom, imageTop + h + 12);
  }
  if (gradcam) {
    const gx = margin + imageWidth + 20;
    doc.addImage(gradcam.dataUrl, "JPEG", gx, imageTop, imageWidth, imageWidth);
    doc.setFontSize(9);
    doc.text("Grad-CAM Visualization", gx, imageTop + imageWidth + 12);
    imageBottom = Math.max(imageBottom, imageTop + imageWidth + 12);
  }
  y = imageBottom + 20;

  if (y > 650) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("AI Findings & Confidence Scores", margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Finding", margin, y);
  doc.text("Confidence", margin + 240, y);
  doc.text("Severity", margin + 340, y);
  doc.text("Status", margin + 430, y);
  y += 6;
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  DISEASE_LABELS.forEach((label) => {
    const probability = input.predictions[label] ?? 0;
    const isPositive = probability >= input.threshold;
    if (y > 760) {
      doc.addPage();
      y = margin;
    }
    doc.text(label, margin, y);
    doc.text(`${Math.round(probability * 100)}%`, margin + 240, y);
    doc.text(getSeverity(probability), margin + 340, y);
    doc.text(isPositive ? "Detected" : "Not detected", margin + 430, y);
    y += 14;
  });
  y += 10;

  if (input.noduleResult) {
    if (y > 680) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("U-Net Lung Nodule Segmentation Assessment", margin, y);
    y += 16;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Status: ${input.noduleResult.noduleDetected ? "LUNG NODULE DETECTED" : "No Lung Nodule Detected"}`,
      margin,
      y
    );
    y += 14;
    doc.text(
      `Peak Detection Confidence: ${Math.round((input.noduleResult.maxConfidence || 0) * 100)}%`,
      margin,
      y
    );
    y += 14;
    doc.text(
      `Nodule Area Coverage: ${input.noduleResult.noduleAreaPercentage || 0}% of lung field`,
      margin,
      y
    );
    y += 18;
  }

  if (y > 650) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Clinical Recommendations", margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  getRecommendations(input.predictions, input.threshold).forEach((rec) => {
    const wrapped = doc.splitTextToSize(`- ${rec}`, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13;
  });
  y += 10;

  if (input.doctorNotes) {
    if (y > 700) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Doctor's Notes", margin, y);
    y += 16;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(input.doctorNotes, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13 + 10;
  }

  if (y > 700) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  const disclaimerLines = doc.splitTextToSize(`Disclaimer: ${DISCLAIMER}`, pageWidth - margin * 2);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 11 + 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (input.inferenceTime > 0) {
    doc.text(`Inference time: ${input.inferenceTime.toFixed(2)}s`, margin, y);
  }
  y += 30;
  doc.line(margin, y, margin + 200, y);
  y += 14;
  doc.text(input.doctorSignature, margin, y);
  y += 14;
  doc.setFontSize(9);
  doc.text(`Reviewed by: ${input.doctorName}`, margin, y);

  return doc.output("blob");
}
