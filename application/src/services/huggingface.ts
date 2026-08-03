import { DISEASE_LABELS } from "@/types";
import type { HuggingFacePredictionResponse, PredictionResult } from "@/types";

const INFERENCE_TIMEOUT_MS = 60_000;

/**
 * Calls the Hugging Face Space that hosts the DenseNet121 inference model.
 *
 * Per the deployment architecture, the TensorFlow model is isolated inside the
 * Hugging Face Space. This app never loads it directly — it only forwards the
 * image and relays the structured JSON response (predictions, Grad-CAM, timing).
 */
export async function runInference(file: File): Promise<PredictionResult> {
  const spaceUrl = process.env.HUGGINGFACE_SPACE_URL;

  if (!spaceUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "HUGGINGFACE_SPACE_URL is not configured. Set it to the deployed inference Space URL."
      );
    }
    // Local development fallback so the UI can be exercised without a live Space.
    console.warn(
      "[huggingface] HUGGINGFACE_SPACE_URL is not set — returning simulated predictions for local development."
    );
    return simulateInference();
  }

  const formData = new FormData();
  formData.append("image", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

  try {
    const response = await fetch(spaceUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: process.env.HUGGINGFACE_API_TOKEN
        ? { Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}` }
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`Hugging Face inference failed with status ${response.status}`);
    }

    const data: HuggingFacePredictionResponse = await response.json();
    return normalizeResponse(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI inference timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeResponse(data: HuggingFacePredictionResponse): PredictionResult {
  const predictions: Record<string, number> = {};
  for (const label of DISEASE_LABELS) {
    const match = data.predictions.find((p) => p.disease === label);
    predictions[label] = match ? match.confidence : 0;
  }

  return {
    predictions,
    gradcam: data.gradcam ?? null,
    inferenceTime: data.inference_time ?? 0,
    simulated: false,
  };
}

function simulateInference(): PredictionResult {
  const predictions: Record<string, number> = {};
  DISEASE_LABELS.forEach((label) => {
    predictions[label] = label === "No Finding" ? Math.random() * 0.5 + 0.4 : Math.random() * 0.6;
  });

  return {
    predictions,
    gradcam: null,
    inferenceTime: 0.5,
    simulated: true,
  };
}
