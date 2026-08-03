"""FastAPI inference server for the AI Lung Diagnostics DenseNet121 model.

Per the project's deployment architecture, this Space does ONLY inference:
load the model, preprocess an incoming chest X-ray, run prediction, generate
a Grad-CAM overlay, and return a structured JSON response. It never touches
a database, never authenticates users, and never generates reports — all of
that lives in the Next.js application that calls this Space.
"""

import io
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from inference import run_inference

app = FastAPI(title="AI Lung Diagnostics - Inference API")

# Restrict this to your Next.js app's origin in production via the
# ALLOWED_ORIGIN env var (Space -> Settings -> Repository secrets/variables).
allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

VALID_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ai-lung-diagnostics-inference"}


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if image.content_type not in VALID_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, and JPEG images are supported.")

    raw_bytes = await image.read()
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size must be less than 20 MB.")

    try:
        pil_image = Image.open(io.BytesIO(raw_bytes))
        pil_image.load()
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    try:
        result = run_inference(pil_image)
    except Exception as error:  # noqa: BLE001 - surface inference failures as a 500 with context
        raise HTTPException(status_code=500, detail=f"Inference failed: {error}") from error

    return result
