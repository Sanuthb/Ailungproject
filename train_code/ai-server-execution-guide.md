# AI Server Execution Guide (via SSH)

Step-by-step reference for getting this project running on the AI server,
from a cold start to a trained model. Written for:

- **Server:** `192.168.48.10` (hostname `MIPHI-AITPC`), user `administrator`,
  Ubuntu 22.04.5 LTS, 2× NVIDIA RTX 4000 Ada (20GB each), 256GB RAM.
- **Local machine:** this Mac, project at
  `/Users/christacademyinstituteforadvancedstudies/Desktop/Ailung`.
- **Remote project path:** `~/ailung` (i.e. `/home/administrator/ailung`).

Run every command in this guide from a terminal on the Mac unless a step
says "on the server" — those happen inside your SSH session.

> ⚠️ **This is a shared account.** `administrator@192.168.48.10` also hosts
> another project (`~/Amzad_Work`, with its own conda envs, `torch`,
> `vllm`). **Never install, upgrade, or modify anything outside `~/ailung`.**
> A `pip install` inside a conda env we created there once leaked into the
> shared `~/.local` user-site packages and broke `torch` for that other
> project — see §4 for why, and how the venv approach here avoids it
> entirely.

---

## 1. Set up passwordless SSH (do this once)

Two keys are involved here, deliberately:

- Your **personal key** (`~/.ssh/id_ed25519`) — passphrase-protected, fine
  for you typing it in interactively, but scripted/automated commands can't
  answer a passphrase prompt.
- A **dedicated automation key** (`~/.ssh/id_ailung_automation`) — no
  passphrase, used only for this project, so automated `ssh`/`scp`/`rsync`
  commands can run with zero prompts.

Generate the automation key and install it on the server:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ailung_automation -N "" -C "ailung-automation"
ssh-copy-id -i ~/.ssh/id_ailung_automation.pub administrator@192.168.48.10
```

(Enter the account password when prompted — that's the only password you
should need going forward.)

Add an alias to `~/.ssh/config` that pins this host to the automation key
specifically:

```
Host ailung-server
    HostName 192.168.48.10
    User administrator
    IdentityFile ~/.ssh/id_ailung_automation
    IdentitiesOnly yes
```

`IdentitiesOnly yes` matters — without it, SSH tries your default-named
keys first (including the passphrase-protected personal one) and hangs
waiting for a passphrase before ever reaching the automation key. With this
in place, `ssh ailung-server` (and any `scp`/`rsync` targeting that alias)
authenticates instantly, no prompts.

---

## 2. Connect and create the project folder structure

```bash
ssh administrator@192.168.48.10
```

On the server:

```bash
mkdir -p ~/ailung/notebooks
mkdir -p ~/ailung/saved_models
mkdir -p ~/ailung/logs
mkdir -p ~/ailung/outputs
```

- `notebooks/` — the `.ipynb` you'll transfer from the Mac.
- `saved_models/` — where Phase 4 writes `best_densenet121.keras`,
  `stage1_model.keras`, `lung_abnormality_model.keras`, `training_log.csv`.
- `logs/` — a place to redirect output when you run training in the
  background (see §8).
- `outputs/` — Phase 5–7 artifacts: `evaluation_results.csv`,
  `gradcam_result.png`, `prediction_report.csv`. (The notebook cells write
  these to the current working directory by default — `cd` into `outputs/`
  before launching Jupyter, or adjust the paths in those cells, whichever
  you prefer.)

The dataset itself doesn't need a folder here — `kagglehub` manages its own
cache under `~/.cache/kagglehub/...` (see Phase 1).

---

## 3. Check what's already on the server

Don't assume a clean machine — the login banner shows a `(base)` conda
prompt, and there's a `conda` install under `~/Amzad_Work/miniconda3`
(another project's, not ours). Check before installing anything:

```bash
python3 --version      # Ubuntu 22.04 ships 3.10.12, confirmed present
which python3
pip3 --version

nvidia-smi
```

`nvidia-smi` confirms the OS/driver sees both GPUs (should list two RTX
4000 Ada, 20GB each). Python 3.10.12 is well within the range recent
TensorFlow supports, so there's no need to install a different Python
version for this project — if a future TensorFlow release drops 3.10
support, install a newer standalone Python scoped to `~/ailung` (e.g. via
`pyenv`) rather than touching the system interpreter or `~/Amzad_Work`'s
conda.

---

## 4. Create an isolated environment — plain `venv`, not conda

**Use `python3 -m venv`, not a conda env.** Here's why this matters, not
just a style choice: a conda env created under `~/Amzad_Work/miniconda3`
(the only conda install on this box) still has `ENABLE_USER_SITE=True` by
default, meaning `pip install` inside it can see — and silently *upgrade in
place* — packages already sitting in the shared
`~/.local/lib/python3.10/site-packages` (used by the other project's
`torch`/`vllm`). That's exactly what happened the first time: installing
`tensorflow[and-cuda]` into a conda env upgraded shared `nvidia-*-cu12` and
`protobuf` packages out from under `torch`, breaking it
(`ImportError: libcudnn.so.9`) for the other project.

A `venv` avoids this automatically — `ENABLE_USER_SITE` is `False` by
default inside one, so it cannot see or touch `~/.local` (or anything else
outside itself) no matter what gets installed:

```bash
python3 -m venv ~/ailung/venv
source ~/ailung/venv/bin/activate

# confirm isolation before installing anything
python -c "import site; print(site.ENABLE_USER_SITE)"   # must print False
```

You'll need to run `source ~/ailung/venv/bin/activate` at the start of
every new SSH session before working on this project. (You'll likely still
see a `(base)` conda prompt segment alongside `(venv)` — that's fine, it's
just PS1 decoration from `~/.bashrc`; as long as `which python` resolves
to `~/ailung/venv/bin/python`, packages install into the venv only.)

---

## 5. Set up Kaggle API credentials (needed before Phase 1 runs)

`kagglehub.dataset_download("ashery/chexpert")` (Phase 1, Cell 5) needs
Kaggle credentials the first time it downloads. Without them it will hang
waiting for interactive login — which breaks headless/unattended runs.

**Confirmed working method (kagglehub 1.0.2):** a single bearer token via
`KAGGLE_API_TOKEN`, kept in a `.env` file **inside our own project folder**
(not `~/.kaggle/` — no need to touch anything outside `~/ailung`):

```bash
# kaggle_token.env, transferred via scp, chmod 600, lives at ~/ailung/kaggle_token.env
KAGGLE_API_TOKEN=KGAT_...
```

Load it before running any download:

```bash
set -a
source ~/ailung/kaggle_token.env
set +a
python -c "import kagglehub; print(kagglehub.dataset_download('ashery/chexpert'))"
```

(The older `KAGGLE_USERNAME`/`KAGGLE_KEY` env vars or `~/.kaggle/kaggle.json`
file also work per kagglehub's docs, but weren't needed here — the token
alone authenticated successfully.)

---

## 6. Install project dependencies

Transfer `requirements.txt` from the Mac (see §7 for the full code
transfer, or just this one file now):

```bash
scp requirements.txt administrator@192.168.48.10:~/ailung/requirements.txt
```

On the server, inside the activated environment:

```bash
cd ~/ailung
pip install -r requirements.txt
python -m ipykernel install --prefix ~/ailung/venv --name ailung --display-name "Ailung (GPU)"
```

(`--prefix ~/ailung/venv` keeps the Jupyter kernelspec inside our venv
instead of the shared `~/.local/share/jupyter/kernels/` — same isolation
principle as everything else here.)

**Common Linux gotcha:** Phase 6 does `import cv2`. On a headless server
this can fail with `libGL.so.1: cannot open shared object file`. The
`requirements.txt` here already uses `opencv-python-headless` to sidestep
this, but if you ever install plain `opencv-python` (e.g. Phase 8 installs
`opencv-python` directly via its own `!pip install` cell) and hit that
error:

```bash
sudo apt-get update && sudo apt-get install -y libgl1 libglib2.0-0
```

---

## 7. Verify TensorFlow sees both GPUs

Inside the activated environment on the server:

```bash
python -c "import tensorflow as tf; print(tf.__version__); print(tf.config.list_physical_devices('GPU'))"
```

Expect two `PhysicalDevice` entries (one per RTX 4000 Ada) — confirmed
working with `tensorflow==2.21.0` via `tensorflow[and-cuda]` from
`requirements.txt` against this server's driver (CUDA 13.0, driver
580.159.03). If it ever prints an empty list, check `nvidia-smi` still
shows the driver, then reinstall `tensorflow[and-cuda]` inside the venv.

---

## 8. Transfer the project code

Three options — pick whichever fits how you want to iterate.

**Option A — `rsync` (recommended for repeated transfers).** Only sends
what changed:

```bash
cd /Users/christacademyinstituteforadvancedstudies/Desktop/Ailung
rsync -avz notebooks/ administrator@192.168.48.10:~/ailung/notebooks/
rsync -avz phase*.md claude.md requirements.txt administrator@192.168.48.10:~/ailung/
```

**Option B — `scp` (fine for a one-off copy):**

```bash
scp -r notebooks administrator@192.168.48.10:~/ailung/
```

**Option C — VS Code Remote-SSH.** Since you're already working in VS
Code's integrated terminal, install the "Remote - SSH" extension, then
`Cmd+Shift+P` → "Remote-SSH: Connect to Host" → `administrator@192.168.48.10`
(or the `ailung-server` alias from §1). This opens a VS Code window running
directly on the server — no manual transfer step at all; you edit and save
files in place. Good for active back-and-forth iteration; `rsync` is better
once you're just pushing a finished notebook over to run.

---

## 9. Run the notebook

**Option A — JupyterLab + SSH tunnel (recommended for the first run).**
Matches your phase-by-phase style: run one phase's cells, check the
output, then move to the next.

On the server:

```bash
cd ~/ailung
source venv/bin/activate
jupyter lab --no-browser --port=8888
```

This prints a URL with a token. Leave it running, and in a **new terminal
tab on the Mac**:

```bash
ssh -L 8888:localhost:8888 administrator@192.168.48.10
```

Now open `http://localhost:8888/...` (with the token from the server's
output) in a browser on the Mac — you're editing/running cells on the
server's GPUs, rendered locally.

**Option B — headless, full run, no interaction needed.** Good once the
notebook is known-good and you just want it to run end to end:

```bash
cd ~/ailung
conda activate ailung
jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=-1 \
  notebooks/Ailung_Lung_Abnormality_Detection.ipynb
```

`--inplace` writes outputs back into the same file so you can inspect
results afterward without needing a live kernel.

---

## 10. Keep long training runs alive across SSH disconnects

Phase 4's fine-tuning stage can run for a while. If your SSH session drops
(closed laptop lid, network blip), a foreground process dies with it.
Use `tmux` so the job keeps running on the server regardless of your
connection:

```bash
tmux new -s ailung
source ~/ailung/venv/bin/activate
cd ~/ailung
jupyter nbconvert --to notebook --execute --inplace \
  --ExecutePreprocessor.timeout=-1 \
  notebooks/Ailung_Lung_Abnormality_Detection.ipynb
```

Detach without killing it: `Ctrl-b` then `d`. Reconnect later from any SSH
session with:

```bash
tmux attach -t ailung
```

(Simpler alternative if you don't want `tmux`: `nohup jupyter nbconvert ... > logs/run.log 2>&1 &` then `disown`.)

---

## 11. Pull results back to the Mac

Once training/evaluation has run, sync the outputs back for your project
report:

```bash
cd /Users/christacademyinstituteforadvancedstudies/Desktop/Ailung
rsync -avz administrator@192.168.48.10:~/ailung/saved_models/ ./saved_models/
rsync -avz administrator@192.168.48.10:~/ailung/outputs/ ./outputs/
rsync -avz administrator@192.168.48.10:~/ailung/notebooks/Ailung_Lung_Abnormality_Detection.ipynb ./notebooks/
```

The last line pulls back the executed notebook (with all outputs/plots
embedded), so you can review results locally without another SSH session.

---

## Quick troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `tf.config.list_physical_devices('GPU')` returns `[]` | TensorFlow/CUDA version mismatch, or venv not activated | Confirm `which python` points into `~/ailung/venv`; reinstall `tensorflow[and-cuda]` |
| `kagglehub` hangs on download | Missing Kaggle API credentials | §5 |
| `ImportError: libGL.so.1` on `import cv2` | Headless server missing GL libs | `sudo apt-get install -y libgl1 libglib2.0-0`, or use `opencv-python-headless` |
| SSH session drops mid-training | No terminal multiplexer | Use `tmux` (§10) |
| `CUDA_ERROR_OUT_OF_MEMORY` during training | Batch size too large for one GPU's 20GB | Lower `BATCH_SIZE` in Phase 2, or check nothing else is holding GPU memory via `nvidia-smi` |
| `ssh administrator@...` asks for a passphrase, not a password, and you're not sure why | Default-named personal key (`id_ed25519`) is being offered before the automation key | Use the `ailung-server` alias, which pins `IdentitiesOnly yes` to the automation key (§1) |
| `pip install` seems to affect packages you didn't ask for (e.g. `torch`, `vllm`, anything under `~/Amzad_Work`) | Installing inside a conda env instead of the venv — conda envs here don't disable user-site by default | Stop immediately, don't proceed with more installs; use the `venv` from §4, which can't touch `~/.local` or anywhere outside itself |
