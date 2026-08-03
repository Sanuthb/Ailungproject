"""FastAPI inference server for the U-Net Lung Nodule Segmentation model.

This microservice handles ONLY U-Net inference: loading the model, preprocessing
chest X-rays to 256x256, running binary segmentation prediction, generating a visual
nodule mask overlay (Base64), and returning structured JSON metadata.
"""

import base64
import io
import os
import time

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from PIL import Image, UnidentifiedImageError
import tensorflow as tf

app = FastAPI(title="AI Lung Diagnostics - U-Net Nodule Segmentation API")

allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

VALID_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
MODEL_PATH = os.environ.get("UNET_MODEL_PATH", "best_lung_nodule_unet.keras")

_model = None


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Model file not found at: {MODEL_PATH}")
        _model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    return _model


@app.on_event("startup")
def startup_event():
    try:
        get_model()
        print(f"[unet-service] Model loaded successfully from {MODEL_PATH}")
    except Exception as exc:
        print(f"[unet-service] Warning: Failed to load model at startup: {exc}")


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "ai-lung-nodule-unet-inference",
        "model_loaded": _model is not None,
    }


def preprocess_image(pil_image: Image.Image) -> tuple[np.ndarray, tuple[int, int]]:
    original_size = pil_image.size  # (width, height)
    gray_image = pil_image.convert("L")
    resized_image = gray_image.resize((256, 256), Image.Resampling.BILINEAR)
    img_array = np.array(resized_image, dtype=np.float32) / 255.0
    input_tensor = np.expand_dims(img_array, axis=(0, -1))  # Shape: (1, 256, 256, 1)
    return input_tensor, original_size


def generate_mask_overlay(
    original_pil: Image.Image, pred_mask: np.ndarray, threshold: float = 0.5
) -> str:
    """Generates a semi-transparent red mask overlay on the original image."""
    orig_np = np.array(original_pil.convert("RGB"))
    orig_h, orig_w = orig_np.shape[:2]

    mask = np.squeeze(pred_mask)
    if mask.ndim == 3:
        mask = mask[..., 0]

    mask_resized = cv2.resize(mask.astype(np.float32), (int(orig_w), int(orig_h)), interpolation=cv2.INTER_LINEAR)
    overlay = orig_np.copy()
    mask_bool = mask_resized > threshold

    if np.any(mask_bool):
        red_mask = np.zeros_like(orig_np)
        red_mask[..., 0] = 239
        red_mask[..., 1] = 68
        red_mask[..., 2] = 68
        blended = cv2.addWeighted(orig_np, 0.5, red_mask, 0.5, 0)
        overlay[mask_bool] = blended[mask_bool]

    overlay_pil = Image.fromarray(overlay)
    buffer = io.BytesIO()
    overlay_pil.save(buffer, format="PNG")
    base64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{base64_str}"


@app.post("/predict")
@app.post("/predict-nodule")
async def predict_nodule(image: UploadFile = File(...)):
    if image.content_type not in VALID_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, detail="Only PNG, JPG, and JPEG images are supported."
        )

    raw_bytes = await image.read()
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400, detail="File size must be less than 20 MB."
        )

    try:
        pil_image = Image.open(io.BytesIO(raw_bytes))
        pil_image.load()
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    start_time = time.perf_counter()

    try:
        model = get_model()
        input_tensor, orig_size = preprocess_image(pil_image)
        pred_mask = model.predict(input_tensor, verbose=0)[0]  # Shape: (256, 256, 1) or (256, 256, 3)

        mask_squeeze = np.squeeze(pred_mask)
        if mask_squeeze.ndim == 3:
            mask_squeeze = mask_squeeze[..., 0]

        max_confidence = float(np.max(mask_squeeze))
        mean_confidence = float(np.mean(mask_squeeze))
        binary_pixels = float(np.sum(mask_squeeze > 0.5))
        total_pixels = float(mask_squeeze.size)
        nodule_area_pct = round((binary_pixels / total_pixels) * 100.0, 2)
        nodule_detected = bool(max_confidence >= 0.5 and nodule_area_pct >= 0.1)

        mask_overlay_b64 = generate_mask_overlay(pil_image, pred_mask, threshold=0.5)

        inference_time = round(time.perf_counter() - start_time, 3)

        return {
            "nodule_detected": nodule_detected,
            "max_confidence": round(max_confidence, 4),
            "mean_confidence": round(mean_confidence, 4),
            "nodule_area_percentage": nodule_area_pct,
            "nodule_mask_overlay": mask_overlay_b64,
            "inference_time": inference_time,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500, detail=f"U-Net Nodule inference failed: {error}"
        ) from error
