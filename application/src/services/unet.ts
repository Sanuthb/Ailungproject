import type { UNetPredictionResponse, UNetPredictionResult } from "@/types";

const INFERENCE_TIMEOUT_MS = 60_000;

/**
 * Calls the containerized U-Net microservice that performs Lung Nodule segmentation inference.
 */
export async function runUNetInference(file: File): Promise<UNetPredictionResult> {
  const serviceUrl = process.env.UNET_SERVICE_URL;

  if (!serviceUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "UNET_SERVICE_URL is not configured. Set it to the deployed U-Net service URL."
      );
    }
    console.warn(
      "[unet] UNET_SERVICE_URL is not set — returning simulated U-Net predictions for local development."
    );
    return simulateUNetInference();
  }

  const formData = new FormData();
  formData.append("image", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

  try {
    const response = await fetch(serviceUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`U-Net inference failed with status ${response.status}`);
    }

    const data: UNetPredictionResponse = await response.json();
    return {
      noduleDetected: data.nodule_detected,
      maxConfidence: data.max_confidence,
      meanConfidence: data.mean_confidence,
      noduleAreaPercentage: data.nodule_area_percentage,
      noduleMaskOverlay: data.nodule_mask_overlay,
      inferenceTime: data.inference_time,
      simulated: false,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("U-Net AI inference timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function simulateUNetInference(): UNetPredictionResult {
  const detected = Math.random() > 0.5;
  return {
    noduleDetected: detected,
    maxConfidence: detected ? Number((Math.random() * 0.4 + 0.55).toFixed(4)) : 0.23,
    meanConfidence: detected ? Number((Math.random() * 0.3 + 0.35).toFixed(4)) : 0.11,
    noduleAreaPercentage: detected ? Number((Math.random() * 3 + 0.5).toFixed(2)) : 0,
    noduleMaskOverlay: null,
    inferenceTime: 0.42,
    simulated: true,
  };
}
