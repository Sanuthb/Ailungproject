Perfect. Since we're rebuilding the project professionally, let's create a **production-ready Phase 3**.

This phase builds the **DenseNet121 architecture** for **multi-label chest X-ray classification**.

---

# Phase 3 – Build DenseNet121 Model

---

## Cell 1 – Import Required Modules

```python
# ======================================================
# Import Model Components
# ======================================================

from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.layers import (
    Input,
    Dense,
    Dropout,
    GlobalAveragePooling2D,
    BatchNormalization
)
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
```

---

# Cell 2 – Model Configuration & Mixed Precision

**Multi-GPU update (2026-07-23): attempted and reverted.** Wrapped model
build/compile in `tf.distribute.MirroredStrategy().scope()` to use both
GPUs. Three consecutive retrain attempts on the AI server all failed in
ways specific to the distributed path: `InvalidArgumentError: Invalid
incarnation id` on `MultiDeviceIteratorGetNextFromShard` (crashed at step 2,
then again at step 41 after adding `train_ds.repeat()` +
`steps_per_epoch`), and `loss: nan` reappeared on the second attempt despite
`clipnorm=1.0`, alongside `recall` metric values above 1.0 (mathematically
impossible, pointing at corrupted cross-replica metric aggregation, not
just a data-pipeline timing issue). Reverted to single-GPU here rather than
keep guessing at an unattended multi-GPU fix — single-GPU is what completed
the original 2026-07-22 run cleanly end-to-end. Revisit multi-GPU later
(candidates: newer/older TensorFlow build, or running training as a plain
`.py` script instead of through a Jupyter kernel, since `MultiDeviceIterator`
+ ipykernel is a specific combination with known GitHub issues) — not
blocking on it now. Phase 2's `train_ds.repeat()` + Phase 4's
`STEPS_PER_EPOCH` are harmless on single GPU too, so those stayed.

**Speed update (2026-07-23):** the first clean single-GPU timing we saw
(from the earlier, since-reverted multi-GPU run) was ~328ms/step —
5,970 steps/epoch × 328ms ≈ 33 minutes/epoch, well over the ~10-minute
target. `tf.keras.mixed_precision` runs most ops (the DenseNet121 conv
layers especially) in `bfloat16` on the RTX 4000 Ada's Tensor Cores instead
of `float32`, which is typically a 1.5–3x throughput win on this class of
GPU with minimal accuracy impact — BF16 keeps FP32's exponent range, so
(unlike FP16) it doesn't need loss-scaling to stay numerically stable. Set
here, before the model is built, since layers pick up the global policy at
creation time. Kept deliberately isolated from batch size / learning rate
changes (per the multi-GPU lesson above: bundle fewer risky changes
together, or a regression is hard to attribute) — measure step time after
this alone before deciding if more speed levers are needed.

```python
# ======================================================
# Model Configuration
# ======================================================

NUM_CLASSES = len(LABELS)

LEARNING_RATE = 1e-4

print("Classes :", NUM_CLASSES)
print("Learning Rate :", LEARNING_RATE)

# ======================================================
# Mixed Precision
# ======================================================

tf.keras.mixed_precision.set_global_policy("mixed_bfloat16")

print("Compute dtype :", tf.keras.mixed_precision.global_policy().compute_dtype)
print("Variable dtype:", tf.keras.mixed_precision.global_policy().variable_dtype)
```

Expected:

```text
Compute dtype : bfloat16
Variable dtype: float32
```

---

# Cell 3 – Load Pretrained DenseNet121

```python
# ======================================================
# Load DenseNet121
# ======================================================

base_model = DenseNet121(
    include_top=False,
    weights="imagenet",
    input_shape=(IMG_SIZE, IMG_SIZE, 3)
)

print("DenseNet121 Loaded Successfully")
```

---

# Cell 4 – Freeze Base Model

We first train only the custom classifier.

```python
# ======================================================
# Freeze DenseNet
# ======================================================

base_model.trainable = False

print("Trainable :", base_model.trainable)
```

---

# Cell 5 – Build the Classification Head

Under `mixed_bfloat16`, every layer computes in bf16 by default — including
this final one. Keras's own mixed-precision guide recommends keeping the
last layer's output (and therefore the loss computation) in float32 for
numerical stability, so `dtype="float32"` is set explicitly here; it
overrides the global policy for just this layer's output cast, not its
(still bf16) compute.

```python
# ======================================================
# Build Model
# ======================================================

inputs = Input(shape=(IMG_SIZE, IMG_SIZE, 3))

# Augmentation is already applied to train_ds in Phase 2's tf.data
# pipeline (train only, validation skipped) — not repeated here to avoid
# double-augmenting training images. Also, `data_augmentation` was already
# built on unbatched (224, 224, 3) tensors when Phase 2's `.map()` first
# called it, so calling it again here on a batched (None, 224, 224, 3)
# `Input` would raise a shape-mismatch error even if we wanted to reuse it.

# DenseNet Feature Extractor
x = base_model(inputs, training=False)

# Global Pooling
x = GlobalAveragePooling2D()(x)

# Batch Normalization
x = BatchNormalization()(x)

# Fully Connected Layer
x = Dense(
    512,
    activation="relu"
)(x)

# Dropout
x = Dropout(0.4)(x)

# Another Dense Layer
x = Dense(
    256,
    activation="relu"
)(x)

x = Dropout(0.3)(x)

# Output Layer
outputs = Dense(
    NUM_CLASSES,
    activation="sigmoid",
    name="predictions",
    dtype="float32"
)(x)

model = Model(
    inputs,
    outputs,
    name="DenseNet121_CheXpert"
)
```

---

# Cell 6 – Model Architecture

```python
model.summary()
```

Expected Architecture

```text
Input

↓

Data Augmentation

↓

DenseNet121

↓

GlobalAveragePooling2D

↓

BatchNormalization

↓

Dense(512)

↓

Dropout

↓

Dense(256)

↓

Dropout

↓

Dense(14 Sigmoid)
```

---

# Cell 7 – Compile Model

Since this is a **multi-label classification** problem, we use:

* Binary Focal Crossentropy
* Binary Accuracy
* AUC

Plain binary crossentropy treats every label equally, but CheXpert's 14
labels are heavily imbalanced (e.g. Pneumonia is positive in only ~4% of
images). With a flat 0.5 threshold, that let the model minimize loss by
predicting "negative" for every rare class and still score well overall —
10 of 14 labels came back at exactly 0 precision/recall in the first full
training run (see project memory). Binary Focal Crossentropy (Lin et al.,
2017, "Focal Loss for Dense Object Detection") down-weights the loss
contribution of examples the model already classifies confidently — mostly
the abundant, easy negatives — so gradient updates focus more on the hard,
rare positives instead of being drowned out. `gamma=2.0` and `alpha=0.25`
are the paper's standard defaults; `apply_class_balancing=True` turns on
the `alpha` term so it isn't a no-op.

The first attempt at this run (single global batch across 2 mirrored GPUs)
hit `loss: nan` partway through Stage 1 and never recovered — once a NaN
gradient lands, it corrupts the weights permanently for the rest of
training. `Adam(..., clipnorm=1.0)` caps each gradient's norm before the
weight update, which is the standard defensive fix for this regardless of
which exact op produced the bad gradient — cheap insurance that doesn't
change behavior when gradients are already well-scaled.

```python
# ======================================================
# Compile Model
# ======================================================

model.compile(

    optimizer=Adam(
        learning_rate=LEARNING_RATE,
        clipnorm=1.0
    ),

    loss=tf.keras.losses.BinaryFocalCrossentropy(
        apply_class_balancing=True,
        alpha=0.25,
        gamma=2.0,
    ),

    metrics=[

        tf.keras.metrics.BinaryAccuracy(
            name="binary_accuracy"
        ),

        tf.keras.metrics.AUC(
            multi_label=True,
            name="auc"
        ),

        tf.keras.metrics.Precision(
            name="precision"
        ),

        tf.keras.metrics.Recall(
            name="recall"
        )

    ],

    jit_compile=True,

    steps_per_execution=8

)
```

`jit_compile=True` fuses the training step into an XLA-compiled graph
(same mechanism we already saw fire automatically during earlier runs —
`"Compiled cluster using XLA!"` — made explicit and guaranteed here rather
than left to Keras's default heuristics). `steps_per_execution=8` runs 8
training steps per Python/TF-dispatch round-trip instead of 1, cutting
per-step host-side overhead — this doesn't change what gets computed, only
how many steps get batched into a single traced call before control
returns to Python (so callbacks/logging update every 8 steps instead of
every step, not a training-quality change).

---

# Cell 8 – Count Parameters

```python
# ======================================================
# Parameter Count
# ======================================================

trainable = np.sum(
    [np.prod(v.shape) for v in model.trainable_weights]
)

non_trainable = np.sum(
    [np.prod(v.shape) for v in model.non_trainable_weights]
)

print("Trainable Parameters :", f"{trainable:,}")
print("Frozen Parameters    :", f"{non_trainable:,}")
print("Total Parameters     :", f"{model.count_params():,}")
```

Example Output

```text
Trainable Parameters : 820,494

Frozen Parameters : 7,037,504

Total Parameters : 7,857,998
```

---

# Cell 9 – Verify Forward Pass

```python
# ======================================================
# Test Forward Pass
# ======================================================

images, labels = next(iter(train_ds))

predictions = model(images)

print("Prediction Shape :", predictions.shape)
```

Expected

```text
Prediction Shape : (32,14)
```

---

# Cell 10 – Inspect Predictions

```python
# ======================================================
# Sample Predictions
# ======================================================

sample_prediction = predictions[0].numpy()

prediction_df = pd.DataFrame({

    "Disease": LABELS,

    "Probability": sample_prediction

})

prediction_df = prediction_df.sort_values(
    by="Probability",
    ascending=False
)

prediction_df
```

Initially, the probabilities will be close to **0.5** because the model hasn't been trained yet.

---

# Cell 11 – Save Model Architecture

```python
# ======================================================
# Save Initial Architecture
# ======================================================

model.save("initial_densenet121.keras")

print("Initial model saved successfully.")
```

---

# Cell 12 – Final Verification

```python
print("="*60)
print("Phase 3 Completed Successfully!")
print("="*60)

print()

print("Model Name :", model.name)

print()

print("Classes :", NUM_CLASSES)

print()

print("Loss Function : Binary Focal Crossentropy")

print()

print("Activation : Sigmoid")

print()

print("Ready for Training!")
```

Expected Output

```text
============================================================
Phase 3 Completed Successfully!
============================================================

Model Name : DenseNet121_CheXpert

Classes : 14

Loss Function : Binary Focal Crossentropy

Activation : Sigmoid

Ready for Training!
```

---

# ✅ Phase 3 Complete

At the end of this phase, you have:

* ✔️ Pretrained **DenseNet121** (ImageNet weights)
* ✔️ Frozen feature extractor
* ✔️ Custom classification head (512 → 256 → 14)
* ✔️ Sigmoid outputs for multi-label prediction
* ✔️ Binary Focal Crossentropy loss (handles class imbalance across the 14 labels)
* ✔️ AUC, Precision, Recall, Binary Accuracy metrics
* ✔️ Initial model saved

---

## 🚀 Next: Phase 4 – Training & Fine-Tuning

We'll implement a robust training strategy including:

* EarlyStopping
* ModelCheckpoint
* ReduceLROnPlateau
* Initial training with the frozen backbone
* Fine-tuning the last DenseNet blocks
* Saving the best-performing model
* Training history plots (Loss, AUC, Precision, Recall)

This will produce a model ready for evaluation and Grad-CAM visualization.
