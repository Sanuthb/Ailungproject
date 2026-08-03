"""Loads the model once at startup and runs prediction + Grad-CAM for a single image."""

import time

import tensorflow as tf
from PIL import Image

from gradcam import build_gradcam_models, compute_heatmap, heatmap_to_transparent_overlay
from labels import LABELS
from preprocess import load_and_preprocess

MODEL_PATH = "best_densenet121.keras"

_model = tf.keras.models.load_model(MODEL_PATH)
_conv_output_model, _classifier_model = build_gradcam_models(_model)


def run_inference(image: Image.Image) -> dict:
    start = time.perf_counter()

    original_size = image.size  # (width, height), used so the heatmap aligns with the original
    input_array = load_and_preprocess(image)

    raw_predictions = _model.predict(input_array, verbose=0)[0]
    predictions = [
        {"disease": label, "confidence": float(confidence)}
        for label, confidence in zip(LABELS, raw_predictions)
    ]

    top_index = int(raw_predictions.argmax())
    heatmap = compute_heatmap(_conv_output_model, _classifier_model, input_array, pred_index=top_index)
    gradcam_base64 = heatmap_to_transparent_overlay(heatmap, target_size=original_size)

    inference_time = time.perf_counter() - start

    return {
        "predictions": predictions,
        "gradcam": gradcam_base64,
        "inference_time": round(inference_time, 3),
    }
