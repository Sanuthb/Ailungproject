Excellent. Below is the **final production-ready Phase 1** for your **AI-Based Lung Abnormality Detection using CheXpert + DenseNet121** project.

This version is compatible with the Kaggle mirror you downloaded:

```
/root/.cache/kagglehub/datasets/ashery/chexpert/versions/1/
```

---

# Phase 1 – Environment Setup & Dataset Loading

---

## Cell 1 – Install Required Libraries (Skip if already installed)

```python
!pip install -q kagglehub
```

---

## Cell 2 – Import Libraries

```python
import os
import random
import warnings

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image

import tensorflow as tf

warnings.filterwarnings("ignore")
```

---

## Cell 3 – Check TensorFlow Version & GPU

```python
print("=" * 50)
print("TensorFlow Version :", tf.__version__)
print("=" * 50)

gpus = tf.config.list_physical_devices("GPU")

if gpus:
    print(f"GPU Detected : {gpus[0].name}")
else:
    print("Running on CPU")
```

---

## Cell 4 – Set Random Seed

```python
SEED = 42

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

print("Random Seed Set :", SEED)
```

---

## Cell 5 – Download Dataset & Resolve Path

We use `kagglehub` to download the dataset and resolve its cache path dynamically.
This avoids hardcoding a path like `/root/.cache/...`, which only exists if you're
running as `root` — on the AI server we're running as `administrator`, so the
cache lives under `/home/administrator/.cache/kagglehub/...` instead.

```python
import kagglehub

DATASET_PATH = kagglehub.dataset_download("ashery/chexpert")

print("Dataset downloaded to:", DATASET_PATH)
```

---

## Cell 6 – Verify Dataset Structure

```python
print("Dataset Contents:\n")

for item in os.listdir(DATASET_PATH):
    print(item)
```

Expected output:

```
train/
valid/
train.csv
valid.csv
```

---

## Cell 7 – Load CSV Files

```python
train_df = pd.read_csv(
    os.path.join(DATASET_PATH, "train.csv")
)

valid_df = pd.read_csv(
    os.path.join(DATASET_PATH, "valid.csv")
)

print("Train Shape :", train_df.shape)
print("Validation Shape :", valid_df.shape)
```

---

## Cell 8 – Define Disease Labels

```python
LABELS = [

    "No Finding",

    "Enlarged Cardiomediastinum",

    "Cardiomegaly",

    "Lung Opacity",

    "Lung Lesion",

    "Edema",

    "Consolidation",

    "Pneumonia",

    "Atelectasis",

    "Pneumothorax",

    "Pleural Effusion",

    "Pleural Other",

    "Fracture",

    "Support Devices"

]
```

---

## Cell 9 – Clean Labels

Replace missing values and uncertain labels.

```python
train_df[LABELS] = (
    train_df[LABELS]
    .fillna(0)
    .replace(-1, 0)
)

valid_df[LABELS] = (
    valid_df[LABELS]
    .fillna(0)
    .replace(-1, 0)
)
```

---

## Cell 10 – Keep Only Frontal X-rays

```python
train_df = train_df[
    train_df["Frontal/Lateral"] == "Frontal"
].reset_index(drop=True)

valid_df = valid_df[
    valid_df["Frontal/Lateral"] == "Frontal"
].reset_index(drop=True)

print("Frontal Training Images :", len(train_df))
print("Frontal Validation Images :", len(valid_df))
```

---

## Cell 11 – Fix Kaggle Mirror Paths

The CSV contains:

```
CheXpert-v1.0-small/train/...
```

Your downloaded dataset contains:

```
train/...
```

So we fix the paths.

```python
train_df["Path"] = train_df["Path"].str.replace(
    "CheXpert-v1.0-small/",
    "",
    regex=False
)

valid_df["Path"] = valid_df["Path"].str.replace(
    "CheXpert-v1.0-small/",
    "",
    regex=False
)
```

---

## Cell 12 – Create Absolute Image Paths

```python
train_df["image_path"] = train_df["Path"].apply(
    lambda x: os.path.join(DATASET_PATH, x)
)

valid_df["image_path"] = valid_df["Path"].apply(
    lambda x: os.path.join(DATASET_PATH, x)
)
```

---

## Cell 13 – Verify Image Exists

```python
sample_path = train_df["image_path"].iloc[0]

print(sample_path)

print()

print("Exists :", os.path.exists(sample_path))
```

Expected:

```
Exists : True
```

---

## Cell 14 – Display Sample Image

```python
img = Image.open(sample_path)

plt.figure(figsize=(6,6))
plt.imshow(img, cmap="gray")
plt.axis("off")
plt.title("Sample Chest X-ray")
plt.show()
```

---

## Cell 15 – Dataset Summary

```python
print("=" * 50)

print("Training Images :", len(train_df))

print("Validation Images :", len(valid_df))

print("=" * 50)
```

---

## Cell 16 – Missing Values Check

```python
train_df[LABELS].isnull().sum()
```

Expected:

```
All zeros
```

---

## Cell 17 – Disease Distribution

```python
disease_counts = train_df[LABELS].sum().sort_values(
    ascending=False
)

plt.figure(figsize=(12,6))

disease_counts.plot(kind="bar")

plt.title("Disease Distribution")

plt.ylabel("Number of Images")

plt.xticks(rotation=60)

plt.show()
```

---

## Cell 18 – Display Random Images

```python
fig, axes = plt.subplots(2, 3, figsize=(12,8))

samples = train_df.sample(6, random_state=42)

for ax, (_, row) in zip(axes.flatten(), samples.iterrows()):

    image = Image.open(row["image_path"])

    ax.imshow(image, cmap="gray")

    ax.axis("off")

plt.tight_layout()

plt.show()
```

---

## Cell 19 – Final Verification

```python
print("Dataset Ready!")

print()

print("Training Samples :", len(train_df))

print("Validation Samples :", len(valid_df))

print()

print("Number of Classes :", len(LABELS))
```

Expected output:

```
Dataset Ready!

Training Samples : XXXXX

Validation Samples : XXXXX

Number of Classes : 14
```

---

# ✅ Phase 1 Complete

At the end of this phase, you will have:

* TensorFlow configured with GPU detection.
* CheXpert CSVs loaded.
* Kaggle mirror paths corrected.
* Only frontal chest X-rays selected.
* Labels cleaned (`NaN` and `-1` handled).
* Absolute image paths created and verified.
* Dataset statistics and disease distribution visualized.
* Sample X-ray images displayed.

The notebook is now ready for **Phase 2**, where we'll build the `tf.data` pipeline with preprocessing, augmentation, batching, and prefetching for efficient training.
