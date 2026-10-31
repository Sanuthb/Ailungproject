# AI Lung Diagnostics: Project Explained

This walkthrough comes from reading the code and notebooks. Final accuracy numbers (AUC, Dice) are not included because they were not found.

## 1. The idea in one sentence
Doctors upload a chest image, and two AI models analyse it. The first model says which of 14 conditions are likely. The second model draws a mask around any lung nodule. The app then builds a PDF report, and a chatbot can explain the results.

## 2. The big picture
The project has three services plus a database. They run in Docker (`docker-compose.yml`).

```
Doctor's browser
      │
      ▼
Next.js web app (port 3000) ── login, patients, reports, dashboard
      │          │
      │          ├──► PostgreSQL (Prisma) + Supabase Storage (images, PDFs)
      │          ├──► Groq API (Llama 3.3 70B chatbot)
      ▼
 ┌──────────────────────┬──────────────────────┐
 │ densenet-service     │ unet-service         │
 │ (port 7860)          │ (port 8001)          │
 │ Model 1: DenseNet121 │ Model 2: U-Net       │
 │ + Grad-CAM           │ nodule segmentation  │
 └──────────────────────┴──────────────────────┘
```

**Design principle:** the AI models are isolated "inference-only" services. They never touch the database or users. The web app handles everything else (`codex.md` states this rule explicitly). This matters because you can update or replace a model without touching the app.

## 3. Folder map

| Folder / file | What it is |
|---|---|
| `application/` | The Next.js web app (frontend and backend) |
| `huggingface-space/` | FastAPI service that runs Model 1 (DenseNet121) and Grad-CAM |
| `unet-service/` | FastAPI service that runs Model 2 (U-Net) |
| `train_code/` | Training notebooks and specs for Model 1 (`phase1.md` to `phase8.md`) |
| `lung_nodule_traincode/` | Training notebook for Model 2 |
| `best_densenet121.keras` (37 MB), `best_lung_nodule_unet.keras` (93 MB) | The trained model files |
| `codex.md` | Project spec and rules |
| `docker-compose.yml` | Runs all three services together |

## 4. The models

### Model 1: DenseNet121 (multi-label classifier)
- **Task:** read a chest X-ray and output a probability for each of 14 findings: No Finding, Enlarged Cardiomediastinum, Cardiomegaly, Lung Opacity, Lung Lesion, Edema, Consolidation, Pneumonia, Atelectasis, Pneumothorax, Pleural Effusion, Pleural Other, Fracture, Support Devices.
- **Multi-label, not multi-class.** A patient can have several findings at once. So the output layer uses 14 independent sigmoid units, not one softmax. Each probability is compared to a threshold (default 0.5, configurable in Settings).
- **Architecture:** DenseNet121 pretrained on ImageNet, with a custom head: global average pooling, batch normalisation, dense layers (512 then 256), then 14 sigmoid outputs.
- **Why DenseNet?** Each layer receives the feature maps of all earlier layers. This reuses features, needs fewer parameters, and is widely used for chest X-rays (the CheXNet paper used it).
- **Dataset:** CheXpert Small. The training code keeps frontal views only.
- **Training in two stages (transfer learning):**
  1. Freeze the DenseNet base and train only the new head for 10 epochs (learning rate 1e-4).
  2. Unfreeze the last 100 layers and fine-tune for 15 more epochs.
- **Loss:** Binary Focal Crossentropy. It down-weights easy examples, which helps because some diseases are rare (class imbalance).
- **Metrics and tuning:** AUC per disease, precision and recall. Early stopping and checkpointing watch validation AUC. The notebook also picks a best F1 threshold per disease.
- **Input:** 224×224 RGB, divided by 255 and nothing else (`preprocess.py`). The comments warn that this must match training exactly.

### Grad-CAM (explainability)
- It is not a separate model. It reuses DenseNet to show where the network looked.
- **How it works** (`gradcam.py`):
  1. Take the last convolution layer (`conv5_block16_concat`).
  2. Compute the gradient of the top predicted class with respect to those feature maps.
  3. Average the gradients to get a weight per channel.
  4. Take the weighted sum of the channels and keep only positive values.
  5. Colour it with the JET colormap and return it as a transparent PNG.
- The web app lays this heatmap over the X-ray.
- **Teaching point:** this shows evidence, not just a number, so doctors can trust the output more.

### Model 2: U-Net (nodule segmentation)
- **Task:** segmentation. It predicts a mask where each pixel is nodule or not.
- **Architecture** (`lung_nodule_traincode`): a U-shaped network.
  - Encoder: 4 blocks of 32, 64, 128 and 256 filters, each with Conv, BatchNorm, ReLU and max-pool.
  - Bottleneck: 512 filters.
  - Decoder: 4 blocks of transposed convolutions that concatenate **skip connections** from the encoder.
  - Output: a 1×1 convolution with sigmoid, giving a 256×256 mask.
  - Teaching point: skip connections let the decoder recover fine spatial detail lost during downsampling.
- **Loss:** BCE + Dice loss. Nodules are tiny, so plain cross-entropy would just predict "background" everywhere. Dice loss directly optimises overlap.
- **Metrics:** Dice, IoU, precision, recall. Training used Adam at 1e-4 for up to 30 epochs, with checkpointing, early stopping and reduce-LR-on-plateau, all watching validation Dice. After training it scanned thresholds from 0.20 to 0.80 to find the best one.
- **Dataset:** "lung-nodule-dataset" from Kaggle (images and mask annotations).
- **At inference** (`unet-service/app.py`):
  - The image is converted to grayscale and resized to 256×256.
  - A pixel counts as nodule above 0.5.
  - The service reports `nodule_detected` if max confidence ≥ 0.5 **and** the area ≥ 0.1% of the image.
  - It also returns max and mean confidence, the area percentage, and a red overlay image.

### Model 3 (not trained by you): Llama 3.3 70B via Groq
- The "AI Assistant" page (`/api/assistant`, `services/groq.ts`) is a chatbot that explains scan results.
- It receives the probabilities, the nodule result, and only the patient's age and gender. Name, phone and address never leave the server.
- The system prompt tells it not to give definitive diagnoses and to decline non-medical questions.

## 5. What happens when a doctor clicks "Predict" (`/api/predict`)
1. The server checks the session (JWT cookie), file type (PNG/JPG) and size (≤ 20 MB), and that the patient exists.
2. It sends the image to **both** AI services at the same time (`Promise.all`).
3. It uploads the original, the Grad-CAM and the nodule mask to Supabase Storage.
4. It saves a `Scan` row with the predictions as JSON.
5. The UI shows the probability table, severity badges, heatmap and nodule overlay.
6. The doctor adds notes and exports a **PDF report** (jsPDF) that includes recommendations and a disclaimer.

**Severity bands** (`utils/disease.ts`): under 0.3 is Normal, under 0.5 Mild, under 0.7 Moderate, 0.7 and above Severe. Recommendations are fixed text per finding, for example Pneumothorax gives "urgent evaluation".

## 6. The web application
- **Stack:** Next.js 15 (App Router), React, TypeScript, Tailwind, Prisma with PostgreSQL.
- **Auth:** custom. Passwords hashed with bcrypt, JWT in an HTTP-only cookie, roles ADMIN and DOCTOR, plus a password-reset flow.
- **Database tables:** `users`, `patients`, `scans`, `reports`, `settings`.
- **Pages:** landing, login, register, dashboard (stats and charts), patients (list, add, detail), predict, reports, assistant, settings.
- **Dev fallback:** if the AI service URLs aren't set, the app returns simulated random predictions. It labels them `simulated: true`.

## 7. Points to be ready for
- **Model mismatch:** the U-Net notebook describes the input as a **CT scan**, but the app feeds it the same **chest X-ray** used for DenseNet. A student could ask whether the nodule model is valid on X-rays. Have an answer ready.
- **Labels:** DenseNet's 14 labels are CheXpert's, so "Lung Lesion" is the nearest thing to a nodule. U-Net is the dedicated nodule detector.
- **Decision support:** the project calls itself decision support. It does not diagnose. The disclaimer in the PDF and the chatbot prompt say so.
- **Security items:**
  - `train_code/kaggle_token.env` is committed to git. If it holds a real token, rotate it and remove it from the repo.
  - The Docker compose file has a placeholder database password.
- **Docs mismatch:** the docs say the DenseNet runs on a "Hugging Face Space", but `docker-compose.yml` runs it locally as `densenet-service`. It is the same code, deployed in different places.
