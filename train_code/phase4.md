Excellent. Now we move to the most important phase of the project: **Training & Fine-Tuning**.

We'll train the model in **two stages**, which is the standard approach for transfer learning:

* **Stage 1:** Train only the custom classifier (DenseNet frozen)
* **Stage 2:** Fine-tune the last DenseNet layers with a lower learning rate

This approach usually yields better performance than training the entire model from the start.

---

# Phase 4 – Training & Fine-Tuning

---

## Cell 1 – Import Callbacks

```python
# ======================================================
# Import Callbacks
# ======================================================

from tensorflow.keras.callbacks import (
    EarlyStopping,
    ModelCheckpoint,
    ReduceLROnPlateau,
    CSVLogger
)
```

---

# Cell 2 – Create Model Save Directory

```python
# ======================================================
# Create Directory
# ======================================================

MODEL_DIR = "saved_models"

os.makedirs(MODEL_DIR, exist_ok=True)

print("Model Directory:", MODEL_DIR)
```

---

# Cell 3 – Define Callbacks

```python
# ======================================================
# Callbacks
# ======================================================

early_stopping = EarlyStopping(
    monitor="val_auc",
    mode="max",
    patience=5,
    restore_best_weights=True,
    verbose=1
)

reduce_lr = ReduceLROnPlateau(
    monitor="val_loss",
    factor=0.2,
    patience=2,
    min_lr=1e-7,
    verbose=1
)

checkpoint = ModelCheckpoint(
    filepath=os.path.join(
        MODEL_DIR,
        "best_densenet121.keras"
    ),
    monitor="val_auc",
    mode="max",
    save_best_only=True,
    verbose=1
)

csv_logger = CSVLogger(
    os.path.join(
        MODEL_DIR,
        "training_log.csv"
    )
)

callbacks = [
    early_stopping,
    reduce_lr,
    checkpoint,
    csv_logger
]
```

---

# Cell 4 – Stage 1 Training Configuration

`train_ds` is now infinite (Phase 2 Cell 11's `.repeat()`), so `model.fit()`
needs to be told explicitly how many steps make up one epoch — this
matches the same batch count each epoch would have covered naturally
before (`ceil(len(train_df) / BATCH_SIZE)`), just computed up front instead
of relying on the dataset running out.

```python
# ======================================================
# Stage 1
# ======================================================

INITIAL_EPOCHS = 10

STEPS_PER_EPOCH = (len(train_df) + BATCH_SIZE - 1) // BATCH_SIZE

print("Stage 1 Training")
print("Frozen DenseNet")
print("Steps per Epoch :", STEPS_PER_EPOCH)
```

---

# Cell 5 – Train Classification Head

```python
# ======================================================
# Stage 1 Training
# ======================================================

history_initial = model.fit(

    train_ds,

    validation_data=valid_ds,

    epochs=INITIAL_EPOCHS,

    steps_per_epoch=STEPS_PER_EPOCH,

    callbacks=callbacks,

    verbose=1

)
```

---

# Cell 6 – Save Stage 1 Model

```python
# ======================================================
# Save Stage 1
# ======================================================

model.save(

    os.path.join(

        MODEL_DIR,

        "stage1_model.keras"

    )

)

print("Stage 1 Model Saved")
```

---

# Cell 7 – Unfreeze DenseNet

Instead of training the entire DenseNet, we'll fine-tune only the **last 100 layers**.

```python
# ======================================================
# Fine Tune
# ======================================================

base_model.trainable = True

print("DenseNet Unfrozen")
```

---

# Cell 8 – Freeze Early Layers

```python
# ======================================================
# Freeze Early Layers
# ======================================================

for layer in base_model.layers[:-100]:

    layer.trainable = False

print("Last 100 layers are trainable.")
```

---

# Cell 9 – Recompile Model

Use a smaller learning rate for fine-tuning. `compile()` resets the loss, so
this must repeat Phase 3 Cell 7's `BinaryFocalCrossentropy` — recompiling
with the string `"binary_crossentropy"` here would silently undo the
class-imbalance fix for the entire fine-tuning stage. Same reasoning
applies to `jit_compile=True` and `steps_per_execution=8` — the mixed
precision *policy* set in Phase 3 Cell 2 stays active for the rest of the
kernel session, but `compile()` itself is a fresh call, so the XLA/step-
batching flags need repeating here too.

```python
# ======================================================
# Recompile
# ======================================================

model.compile(

    optimizer=Adam(
        learning_rate=1e-5,
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

---

# Cell 10 – Fine-Tuning Configuration

```python
# ======================================================
# Stage 2
# ======================================================

FINE_TUNE_EPOCHS = 15

TOTAL_EPOCHS = INITIAL_EPOCHS + FINE_TUNE_EPOCHS

print("Fine Tuning Started")
```

---

# Cell 11 – Fine-Tune Model

```python
# ======================================================
# Fine Tune
# ======================================================

history_fine = model.fit(

    train_ds,

    validation_data=valid_ds,

    epochs=TOTAL_EPOCHS,

    initial_epoch=history_initial.epoch[-1] + 1,

    steps_per_epoch=STEPS_PER_EPOCH,

    callbacks=callbacks,

    verbose=1

)
```

---

# Cell 12 – Save Final Model

```python
# ======================================================
# Save Final Model
# ======================================================

model.save(

    os.path.join(

        MODEL_DIR,

        "lung_abnormality_model.keras"

    )

)

print("Final Model Saved Successfully")
```

---

# Cell 13 – Load Best Model

```python
# ======================================================
# Load Best Model
# ======================================================

best_model = tf.keras.models.load_model(

    os.path.join(

        MODEL_DIR,

        "best_densenet121.keras"

    )

)

print("Best Model Loaded")
```

---

# Cell 14 – Plot Training Loss

```python
# ======================================================
# Training Loss
# ======================================================

plt.figure(figsize=(8,5))

plt.plot(
    history_initial.history["loss"],
    label="Train Loss"
)

plt.plot(
    history_initial.history["val_loss"],
    label="Validation Loss"
)

plt.xlabel("Epoch")

plt.ylabel("Loss")

plt.title("Stage 1 Loss")

plt.legend()

plt.show()
```

---

# Cell 15 – Plot AUC

```python
# ======================================================
# AUC
# ======================================================

plt.figure(figsize=(8,5))

plt.plot(
    history_initial.history["auc"],
    label="Train AUC"
)

plt.plot(
    history_initial.history["val_auc"],
    label="Validation AUC"
)

plt.xlabel("Epoch")

plt.ylabel("AUC")

plt.title("Stage 1 AUC")

plt.legend()

plt.show()
```

---

# Cell 16 – Evaluate Best Model

```python
# ======================================================
# Evaluation
# ======================================================

results = best_model.evaluate(valid_ds, return_dict=True)

print()

for metric, value in results.items():

    print(f"{metric}: {value:.4f}")
```

Note: Keras 3 (bundled with TensorFlow 2.16+) collapses
`model.metrics_names` down to `["loss", "compile_metrics"]` instead of one
name per compiled metric, even though `evaluate()` still returns one score
per metric. Zipping the two together silently truncates to 2 entries.
`return_dict=True` sidesteps this — it returns a dict keyed by the actual
metric names (`loss`, `binary_accuracy`, `auc`, `precision`, `recall`)
regardless of Keras version.

---

# Cell 17 – Display Metrics

```python
# ======================================================
# Final Metrics
# ======================================================

metrics = pd.DataFrame({

    "Metric": list(results.keys()),

    "Value": list(results.values())

})

metrics
```

---

# Cell 18 – Training Summary

```python
print("=" * 60)
print("Phase 4 Completed Successfully!")
print("=" * 60)

print()

print("Stage 1 Training Completed")

print("Fine-Tuning Completed")

print("Best Model Saved")

print("Training Logs Saved")

print("Model Ready for Evaluation")
```

---

# 📁 Files Generated

After training, your project directory will contain:

```text
saved_models/
│
├── best_densenet121.keras
├── stage1_model.keras
├── lung_abnormality_model.keras
└── training_log.csv
```

---

# ✅ Phase 4 Complete

By the end of this phase, you'll have:

* ✔️ Two-stage transfer learning (feature extraction + fine-tuning)
* ✔️ Automatic learning rate reduction
* ✔️ Early stopping based on validation AUC
* ✔️ Best model checkpointing
* ✔️ CSV logs for training analysis
* ✔️ Final trained model ready for inference

---

## 🚀 Next: Phase 5 – Model Evaluation & Performance Analysis

We'll evaluate the trained model with metrics and visualizations expected in an academic project:

* ROC Curve (per disease)
* AUC Score
* Precision, Recall, F1-Score
* Multi-label confusion matrices
* Threshold tuning
* Classification report
* Performance summary tables suitable for your MCA project report.
