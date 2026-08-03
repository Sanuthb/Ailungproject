# AI Lung Diagnostics — Inference API

Inference-only backend for the AI Lung Diagnostics project. Loads a DenseNet121
model trained on the CheXpert Small dataset (14 disease labels, 224×224 RGB
input) and serves predictions plus a Grad-CAM overlay over a simple HTTP API.

## Architecture

The Docker image contains the FastAPI server, the trained model, and all
dependencies. It exposes a single port for HTTP requests and does **not**
store patients, authenticate users, or talk to a database — that all lives
in the Next.js frontend application.

## API

### POST /predict

Multipart form-data with a single field:

- image — a PNG or JPEG file, up to 20 MB.

Response:

json
{
  "predictions": [
    { "disease": "No Finding", "confidence": 0.12 },
    { "disease": "Cardiomegaly", "confidence": 0.83 }
  ],
  "gradcam": "<base64-png, RGBA, transparent background>",
  "inference_time": 0.82
}


predictions always contains all 14 labels, in the order defined in
labels.py. gradcam is a transparent-background heatmap sized to match the
uploaded image, meant to be layered on top of the original with CSS opacity
(not a pre-blended composite).

### GET /

Health check.

## Build and run with Docker

`ash
# Build the Docker image from the project root
docker build -t ailung-api .

# Run the container
docker run -p 7860:7860 ailung-api
`

The server will be available at http://localhost:7860.

## Environment Variables

| Variable        | Default | Description                                      |
|-----------------|---------|--------------------------------------------------|
| ALLOWED_ORIGIN  | *       | CORS origin (set to your Next.js app URL in production) |

## Notes

- The Grad-CAM implementation targets the conv5_block16_concat layer inside
  the nested DenseNet121 backbone — see gradcam.py for details.
- Model file est_densenet121.keras must be present in the build context.
