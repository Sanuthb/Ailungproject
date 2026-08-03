# MiPhi aiDAPTIV+ GUI — Training SOP & Compatibility Notes

Reference: `Miphi Assets/Miphi_GUI_User_Manual_V3....pdf` (75 pages, read in full
2026-07-23) plus live screenshots of `http://192.168.48.10:7047`. This
documents the GUI dashboard at the same IP as the AI server but running as a
separate Docker-based tool with its own storage namespace (`/usr/local/datasets`,
`/usr/local/models` inside its container — **not** `~/ailung` on the host).

## Verdict: doesn't fit the Ailung model as-is

The GUI's **Finetune** page only supports four fixed task types, each with a
fixed dataset schema and a fixed training loop underneath — there's no "run
my own Keras/PyTorch script" option. It's built for fine-tuning existing
HuggingFace-style models (mostly LLMs), not for training a custom
from-scratch CNN like our DenseNet121:

| Task Type | Dataset shape | What it actually trains |
|---|---|---|
| Text Generation | Pretrain/QA/RAG JSON | causal LMs (Llama, CodeLlama, etc.) |
| Image Text-to-Text | VQA JSON + images | vision-language chat models |
| Automatic Speech Recognition | audio + transcript JSON | ASR models (e.g. Whisper-family) |
| **Zero-shot Image Classification** | `images/` + JSON with **one `label` string per image** | **CLIP-family contrastive models** (Model Preview showed `clip-vit-large-patch14`, `"model_type": "clip"`, `"architectures": ["CLIPModel"]`) |

The closest match to "image classification" is the last row, and it's a
poor fit for CheXpert specifically:

- **Single-label schema.** The required JSON format is
  `{"image_path": "images/x.jpg", "label": "your_label_here"}` — one label
  per image. CheXpert is inherently **multi-label** (a single X-ray
  routinely has several simultaneous findings — e.g. both Cardiomegaly
  *and* Pleural Effusion). Fitting our data into this schema means
  collapsing each study down to one label, a real loss of information the
  current DenseNet121 sigmoid-head pipeline doesn't have.
- **It's genuinely zero-shot, not a fixed 14-class classifier.** At
  inference time (Inference → Chat Room), you don't get scores for a fixed
  label set — you type up to 5 free-text prompts *per query* and the model
  ranks them by CLIP embedding similarity to the image. There's no
  persistent "these are the 14 CheXpert labels, always scored" behavior
  like our current `predict_xray()` pipeline.
- **LoRA and Triton are disabled** for this task type, and
  **per-device train batch size must be ≥ 2** (manual's explicit note).
- Even the *purpose* differs: CLIP zero-shot classification is about
  matching images to arbitrary text at query time, not learning a
  supervised multi-label decision boundary the way focal-loss + sigmoid
  training does.

**Recommendation:** keep training the real CheXpert model via the existing
Jupyter/tmux SSH workflow (`ai-server-execution-guide.md`) — it's the only
path on this server that supports our custom architecture, multi-label
sigmoid head, and `BinaryFocalCrossentropy` loss. Treat the MiPhi GUI as a
separate tool for LLM fine-tuning/inference (its main demonstrated use —
see the completed `Llama-3.1-8B-Instruct` job in its History) or for
genuinely zero-shot/exploratory single-label image experiments, not as a
replacement for the notebook pipeline.

---

## SOP: if you still want to try it (single-label reformulation)

### 1. Prepare the dataset
Build a ZIP containing:
```
your_dataset.zip
├── zero-shot-classification-dataset.json
├── images/
│   ├── image_1.jpg
│   ├── image_2.jpg
│   └── ...
└── info.txt          (optional)
```
Each JSON line: `{"image_path": "images/image_1.jpg", "label": "your_label_here"}`.
Supported image formats: png, jpg, jpeg.

Since CheXpert is multi-label, you'd need to collapse each study to **one**
label first (e.g. the most clinically significant positive finding, or
"No Finding" if none) — decide this mapping before generating the JSON.

### 2. Upload the dataset
- Sidebar → **Datasets** → Task Type = *Zero-Shot Image Classification*.
- Set Dataset Path (default `/usr/local/datasets`).
- Drag the ZIP into the upload area — it's validated (must contain an
  `images/` folder + a JSON file), then auto-extracted.
- Confirm it appears under "Available Zero shot-image-classification
  Datasets."

### 3. Make sure a CLIP-family model is available
- Sidebar → **Models** → check `/usr/local/models` for something like
  `clip-vit-large-patch14`. If missing, upload a model ZIP there (uploaded
  models must be ZIP format; existing-name conflicts prompt
  Replace/Skip).

### 4. Configure and launch the fine-tune job
Sidebar → **Finetune**, left panel, top to bottom:

- **Model Configuration:** Select Model = your CLIP model · Task Type =
  *Zero-Shot Image Classification* · Dataset Type = *HuggingFace* · pick
  the dataset folder · Image Key = `image_path` · Label Key = `label` ·
  Num Rows = number of rows to use (≤ total; higher values auto-clamp to
  all available rows).
- **Path Configuration:** aiDAPTIV+ Mount Point, Output Directory, Log
  Name (auto-filled from the model name).
- **Hardware Configuration:** Select GPU(s) · Precision Mode (FP32 / FP16
  / BF16 — BF16 Mixed Precision is a reasonable default: fast, high
  accuracy, moderate memory per the manual's table).
- **Training Parameters:** Per-Device Train Batch Size (**must be ≥ 2**
  for this task type) · Per-Update Total Batch Size · Training Epochs ·
  Max Iterations (`-1` = epoch-driven, not iteration-capped).
- **Optimizer Settings:** Learning Rate · LR Scheduler Mode (`-1` through
  `5`, see manual §8.5.2 for the exact scheduler each mode maps to) ·
  Beta1/Beta2/Epsilon (Adam hyperparameters) · Weight Decay.
- **LoRA Configuration:** disabled/inapplicable for this task type.
- **Model Saver:** Max Num of Saved Models on Epoch End (`-1` = keep all)
  · Enable Save Model on Iteration · Max Num of Saved Models on Iteration
  · Num of Iterations to Save Model. Watch the auto-computed storage
  estimate — **Start Fine-tuning stays disabled if there isn't enough
  space** in the output directory.
- Review the **Configuration Summary** (right panel, live JSON) → click
  **Start Fine-tuning**.

### 5. Monitor the run
You're auto-redirected to **Monitor**:
- Training Statistics (Environment + Experiment Configuration).
- Elapsed Time, Current Epoch / Total Epochs / Microbatches.
- NVMe Device Details (throughput, temperature) and live GPU Monitoring
  (utilization %, VRAM).
- Training Logs (last 50 lines, live-updating) with a "View Execution Log"
  drill-down and a "Download Logs" button (bundles fine-tune + execution
  logs).
- System Metrics (CPU/RAM/disk) and a live Training Graph (loss vs. time).
- **Stop Training** button terminates the job immediately if needed.

### 6. After training
- **History** lists every past job by log filename; selecting one shows
  its full Environment/Experiment Configuration, aiDAPTIV+ storage and GPU
  utilization stats, and the training log + loss graph — useful for
  reproducing or comparing runs later.
- **Logs** page lets you select up to 6 log files at once for a
  comparative dashboard (CPU/RAM/GPU/VRAM/NVMe over time, loss vs.
  iteration, forward/backward/update time breakdown per run).

### 7. Run inference against it
Sidebar → **Inference** → Model Configuration → find your fine-tuned model
→ gear icon → Model Type = *Zero-shot Image Classification* → set
aiDAPTIV Path and GPU Selection → Save Changes → pin (🖈) the model to load
it → **Chat Room** → upload an image → enter up to **5** text prompts
(your candidate diagnosis labels) in the "Number of predictions" /
per-prompt fields → **Run Classification** → get ranked results with
confidence scores against exactly those prompts (not a fixed label set).

---

## Everything else the GUI offers (unrelated to this task, noted for completeness)

- **Login:** `admin@miphi.in` / `Admin1234` (default — change via Profile
  Settings → Security). Admin-only **User Management** for provisioning
  read/write/admin accounts.
- **System Dashboard:** live OS/CUDA/GPU/CPU/DRAM/aiDAPTIV+-cache/storage
  specs for the box this GUI is managing.
- **Dataset Generator** (separate from the Datasets page): turns
  PDF/DOC/DOCX/TXT/HTML/PPTX documents into Pretrain/QA/RAG-format JSON
  datasets for **Text Generation only** — not applicable to image data.
- **Model Quantization** (Inference → Models → expand icon): GPTQ/AWQ
  quantization to 4/8-bit for LLMs already in `/usr/local/models`.
