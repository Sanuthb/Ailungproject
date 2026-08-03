# AI Lung Abnormality Detection

MCA project: multi-label chest X-ray disease classification using the CheXpert
dataset and a DenseNet121 backbone, with Grad-CAM explainability and a
Hugging Face / Gradio deployment target. Eventually integrates with a Next.js
frontend.

## Status

Not a git repo yet. Dataset is downloaded and cached on the AI server
(`kagglehub` cache under `~/.cache/kagglehub/...`) — training has run
multiple times there. Development happens locally on this Mac (no GPU);
execution happens on the AI server (see below).

## Project layout

- `phase1.md` … `phase8.md` — source-of-truth spec for each phase, written as
  markdown with embedded Python cells. Edit these first; the notebook is
  generated from them.
- `notebooks/Ailung_Lung_Abnormality_Detection.ipynb` — generated master
  notebook combining all 8 phases into one runnable notebook, meant to be run
  top-to-bottom in a single kernel session on the AI server (later phases
  depend on variables — `train_df`, `model`, `base_model`, `best_model`,
  etc. — set by earlier phases).
- `dataset.download.md` — original standalone kagglehub download snippet.
  Its logic is now folded into Phase 1 Cell 5 directly (see below), so this
  file is just a reference now.
- `requirements.txt` — pip dependencies for the training/eval pipeline
  (Phases 1-7). Phase 8's Gradio deployment ships its own separate
  `requirements.txt`, written to disk by that phase's notebook cell.
- `ai-server-execution-guide.md` — full walkthrough for running this on the
  AI server via SSH: passwordless auth, folder setup, checking
  Python/conda, creating an isolated env, Kaggle API credentials, code
  transfer, running the notebook (interactive Jupyter+tunnel or headless
  `nbconvert`), keeping training alive across SSH disconnects with `tmux`,
  and pulling results back. Read this before doing anything on the server.
- `Ai server spec.pdf`, `AI server via SSH.png` — AI server hardware specs
  and a working SSH login screenshot.
- `miphi-gui-execution-guide.md` — SOP for the MiPhi aiDAPTIV+ web GUI
  (`http://192.168.48.10:7047`, separate Docker-based tool, not the SSH
  workflow above). **Verdict: doesn't fit this project's multi-label
  DenseNet121 pipeline** — its Finetune page only supports 4 fixed HF-style
  task types (Text Generation, Image Text-to-Text, ASR, Zero-shot Image
  Classification), no custom-architecture/custom-loss training. The
  closest task type (Zero-shot Image Classification, CLIP-family models)
  expects one single label per image, incompatible with CheXpert's
  multi-label findings. Keep using the SSH/Jupyter workflow for the actual
  model; the GUI is a separate tool mainly demonstrated so far for LLM
  fine-tuning. Full detail and the step-by-step SOP (if ever needed for a
  single-label experiment) are in that file. Source assets in
  `Miphi Assets/` (user manual PDF + dashboard screenshots).

To regenerate the notebook after editing any `phaseN.md`, rerun the
converter script described in the next session, or ask Claude to rebuild it
— it parses each phase's fenced ` ```python ` blocks into code cells and
everything else into markdown cells, with Phase 8 special-cased so its file
sections become `%%writefile` cells (so running Phase 8 actually produces
`labels.py`, `utils.py`, `predict.py`, `app.py`, `requirements.txt`,
`README.md` on disk).

## Phase breakdown

1. Environment setup & dataset loading (kagglehub download, CSV load, label
   cleaning, frontal-only filter, path fix for the Kaggle mirror layout).
2. `tf.data` pipeline — resize to 224×224, normalize, augmentation, batch,
   prefetch.
3. Model architecture — DenseNet121 (ImageNet weights, frozen initially) +
   custom classification head (512→256→14, sigmoid), compiled with binary
   focal crossentropy (`gamma=2.0`, `alpha=0.25`, class-balanced — handles
   the label imbalance across CheXpert's 14 classes) +
   AUC/Precision/Recall/BinaryAccuracy.
4. Training & fine-tuning — two-stage transfer learning (frozen head first,
   then unfreeze last 100 DenseNet layers at a lower LR). EarlyStopping,
   ModelCheckpoint, ReduceLROnPlateau, CSVLogger.
5. Evaluation — per-disease ROC/AUC, classification report, confusion
   matrices, summary CSV.
6. Explainable AI — Grad-CAM heatmaps overlaid on the original X-ray.
7. Inference pipeline — single-image prediction, severity estimation,
   structured AI report (CSV + dict for API use).
8. Deployment — Gradio app for Hugging Face Spaces, with an integration
   snippet for calling it from Next.js.

## Known issues / things to revisit

- **Grad-CAM vs. nested model (fixed):** Phase 3's `model` wraps
  `base_model` as a sub-model (`x = base_model(x, training=False)`), so
  `model.get_layer(last_conv_layer_name)` would fail in Phase 6 — the
  target conv layer lives inside the nested `densenet121` submodel, not as
  a direct layer of `model`. Phase 6 Cells 2–3 now locate the nested
  backbone first, then rebuild the forward pass in two pieces (backbone
  input → last conv layer, then the remaining classifier layers replayed on
  top) inside one `GradientTape`. No change to Phase 3 was needed.
- **Dataset path (fixed):** Phase 1 originally hardcoded
  `/root/.cache/kagglehub/...`, which only exists if you're running as
  `root`. The AI server session runs as `administrator`, so the cache
  actually lives under `/home/administrator/.cache/kagglehub/...`. Phase 1
  Cell 5 now calls `kagglehub.dataset_download(...)` directly and uses its
  returned path instead of a hardcoded one.
- **Multi-GPU training (attempted 2026-07-23, reverted):** tried wrapping
  Phase 3/4's model build/compile in `tf.distribute.MirroredStrategy().scope()`
  to use both GPUs (20GB each) instead of one. Three straight retrain
  attempts failed in ways specific to the distributed path:
  `InvalidArgumentError: Invalid incarnation id` on
  `MultiDeviceIteratorGetNextFromShard` (crashed at step 2, then step 41
  after adding `train_ds.repeat()`/`steps_per_epoch`), plus `loss: nan` and
  impossible `recall > 1.0` metric values on the second attempt (pointing at
  corrupted cross-replica metric aggregation). Reverted `MirroredStrategy`
  entirely — Phase 3/4 are back to single-GPU, which is what completed the
  original 2026-07-22 run cleanly. A likely real contributor turned out to
  be the shuffle-buffer memory bug below (110GB of memory pressure during
  iterator creation could easily trigger exactly this class of bug) — worth
  retrying multi-GPU *after* confirming single-GPU trains cleanly with the
  buffer fix, so the two issues don't get conflated again. Phase 2's
  `train_ds.repeat()` + Phase 4's `STEPS_PER_EPOCH` stayed (harmless on
  single GPU too). See [[project-phase4-model-performance]] for full detail.
- **Oversized shuffle buffer (fixed 2026-07-23):** Phase 2 Cell 10 used
  `train_ds.shuffle(buffer_size=len(train_df))` — a "perfect shuffle" that
  holds the *entire* 191,027-image training set in memory after
  preprocessing (~110GB at 224×224×3 float32). Confirmed directly: the
  retrain kernel process was using 142GB RSS before being killed, with each
  buffer refill (there are several — Phase 2/3 have multiple ad-hoc
  `next(iter(train_ds))`/`.take()` verification cells, each triggering a
  fresh refill) taking 90-100+ seconds. This was likely the real root cause
  of the day's slowness and a plausible contributor to the multi-GPU crashes
  above. Fixed by dropping `buffer_size` to `5000` — standard for image
  pipelines this size, equivalent shuffle quality, tiny fraction of the
  memory/time. **Debugging note:** for a non-crashing `nbconvert --execute`
  run, cell `print()` output (including `"Epoch 1/10"` and the progress bar)
  does not appear in the piped log/tmux pane in real time — only check
  `ps aux` (kernel RSS/CPU) and `saved_models/training_log.csv` (one row per
  completed epoch) to confirm a healthy run is actually progressing.
- **Per-class threshold tuning (fixed):** the first full training run
  (2026-07-22) hit 0 precision/recall on 10 of 14 labels — an artifact of
  applying one global 0.5 cutoff across labels with wildly different
  prevalence (e.g. Pneumonia ~4% positive), not a sign the model learned
  nothing (per-disease AUC was reasonable). Phase 5 Cells 15–16 now compute
  an F1-maximizing threshold per label from the validation
  precision-recall curve and save it to `saved_models/optimal_thresholds.json`;
  Phase 6 Cell 10 and Phase 7 (Cells 2 and 10) both load that file and use
  it instead of a blanket 0.50, falling back to 0.50 for any label missing
  from it (e.g. zero-positive-example labels in the validation split).
- **Rare-label recall (fix applied 2026-07-23, retrain pending):** the same
  0/14-labels issue above also stemmed from class imbalance during
  training itself, not just the eval-time threshold — vanilla binary
  crossentropy lets the model minimize loss by predicting "negative"
  everywhere for rare labels. Phase 3 Cell 7 and Phase 4 Cell 9 now compile
  with `tf.keras.losses.BinaryFocalCrossentropy(apply_class_balancing=True,
  alpha=0.25, gamma=2.0)` instead of `"binary_crossentropy"`, so gradient
  updates weight the hard/rare positives more heavily during both training
  stages. Not yet validated against a real run — needs a fresh Phase 1→5
  pass on the AI server. See [[project-phase4-model-performance]].
- **Shared-account incident (root cause fixed):** installing
  `requirements.txt` into a conda env once leaked into the shared
  `~/.local/lib/python3.10/site-packages` (conda envs there don't disable
  user-site by default) and broke `torch`/`vllm` for the other project on
  this account (`~/Amzad_Work`). That breakage was left untouched — not
  ours to fix — and we switched to an isolated `venv` (which disables
  user-site by default) so it can't recur. See
  [[feedback-ai-server-shared-account]].

## AI server

- Host: `192.168.48.10` (hostname `MIPHI-AITPC`), reachable on the local
  network. Dashboard at `http://192.168.48.10:7047/SystemDashboard` (MiPhi
  aiDAPTIV+).
- Login: `ssh ailung-server` — passwordless, via a dedicated automation key
  (`~/.ssh/id_ailung_automation`, no passphrase) pinned in `~/.ssh/config`
  with `IdentitiesOnly yes`. Full setup steps in
  `ai-server-execution-guide.md` §1.
- **Shared account — `~/Amzad_Work` belongs to another project on this same
  `administrator` account.** Never install, upgrade, or write anything
  outside `~/ailung`. See "Known issues" below for what happened when this
  wasn't respected, and [[feedback-ai-server-shared-account]].
- OS: Ubuntu 22.04.5 LTS, kernel 6.8.0-124-generic.
- GPUs: 2× NVIDIA RTX 4000 Ada Generation, 20GB VRAM each. NVIDIA driver
  580.159.03, CUDA driver 13.0.
- CPU: 2× Intel Xeon Silver 4410Y (12 cores/socket, 48 threads total).
- RAM: 256GB DDR5.
- Storage: 1.2TB free of 1.9TB.
- Python: system `python3` is 3.10.12 (only version installed). Project
  uses a plain `venv` at `~/ailung/venv` — **not** the conda install under
  `~/Amzad_Work/miniconda3` (that conda has `ENABLE_USER_SITE=True` by
  default, so a conda env there can leak installs into the shared
  `~/.local`; a `venv` can't, see Known issues). Confirmed working:
  `tensorflow==2.21.0` (via `tensorflow[and-cuda]`) sees both GPUs.
- Kaggle auth: `KAGGLE_API_TOKEN=KGAT_...` in `~/ailung/kaggle_token.env`
  (chmod 600, kept inside our own folder, not `~/.kaggle/`). Confirmed
  working with `kagglehub` 1.0.2 — load via `set -a; source
  ~/ailung/kaggle_token.env; set +a` before any `kagglehub` call.

## Workflow

Build and edit notebook/phase content locally on the Mac (no GPU needed for
authoring). Transfer to the AI server before running anything that touches
the dataset or trains the model — this Mac can't run Phase 3 onward at any
reasonable speed.

```
rsync -avz notebooks/ ailung-server:~/ailung/notebooks/
rsync -avz phase*.md claude.md requirements.txt ailung-server:~/ailung/
```

Then SSH in (`ssh ailung-server`), `cd ~/ailung`, `source venv/bin/activate`,
and launch Jupyter (`jupyter lab --no-browser --port 8888`), tunneling from
the Mac with `ssh -L 8888:localhost:8888 ailung-server` to open it in a
local browser. Full detail, including headless execution and `tmux` for
long training runs, is in `ai-server-execution-guide.md`.
