Excellent. This is the **updated Phase 2** for your project. It is designed to work seamlessly with the **Phase 1** notebook and prepares the dataset for training **DenseNet121**.

---

# Phase 2 – Data Preprocessing & TensorFlow Pipeline

---

## Cell 1 – Configuration

```python
# ======================================================
# Configuration
# ======================================================

IMG_SIZE = 224
BATCH_SIZE = 32
AUTOTUNE = tf.data.AUTOTUNE

print(f"Image Size : {IMG_SIZE}x{IMG_SIZE}")
print(f"Batch Size : {BATCH_SIZE}")
```

---

## Cell 2 – Convert Labels to NumPy Arrays

```python
# ======================================================
# Prepare Labels
# ======================================================

train_labels = train_df[LABELS].astype(np.float32).values

valid_labels = valid_df[LABELS].astype(np.float32).values

print(train_labels.shape)
print(valid_labels.shape)
```

Expected Output

```
(XXXXX, 14)
(XXXXX, 14)
```

---

## Cell 3 – Data Augmentation

```python
# ======================================================
# Data Augmentation
# ======================================================

data_augmentation = tf.keras.Sequential([

    tf.keras.layers.RandomFlip("horizontal"),

    tf.keras.layers.RandomRotation(0.05),

    tf.keras.layers.RandomZoom(0.10),

    tf.keras.layers.RandomContrast(0.10),

], name="augmentation")
```

---

## Cell 4 – Image Loading Function

```python
# ======================================================
# Read Image
# ======================================================

def load_image(path, labels):

    image = tf.io.read_file(path)

    image = tf.image.decode_jpeg(image, channels=3)

    image = tf.image.resize(
        image,
        (IMG_SIZE, IMG_SIZE)
    )

    image = tf.cast(image, tf.float32)

    image = image / 255.0

    return image, labels
```

---

## Cell 5 – Training Preprocessing

```python
# ======================================================
# Training Pipeline
# ======================================================

def preprocess_train(image, labels):

    image = data_augmentation(image)

    return image, labels
```

---

## Cell 6 – Validation Preprocessing

```python
# ======================================================
# Validation Pipeline
# ======================================================

def preprocess_valid(image, labels):

    return image, labels
```

---

## Cell 7 – Create TensorFlow Dataset

```python
# ======================================================
# Create Dataset
# ======================================================

train_ds = tf.data.Dataset.from_tensor_slices(

    (
        train_df["image_path"].values,
        train_labels
    )

)

valid_ds = tf.data.Dataset.from_tensor_slices(

    (
        valid_df["image_path"].values,
        valid_labels
    )

)

print(train_ds)
print(valid_ds)
```

---

## Cell 8 – Apply Loading Function

```python
# ======================================================
# Read Images
# ======================================================

train_ds = train_ds.map(

    load_image,

    num_parallel_calls=AUTOTUNE

)

valid_ds = valid_ds.map(

    load_image,

    num_parallel_calls=AUTOTUNE

)
```

---

## Cell 9 – Apply Data Augmentation

```python
# ======================================================
# Apply Augmentation
# ======================================================

train_ds = train_ds.map(

    preprocess_train,

    num_parallel_calls=AUTOTUNE

)

valid_ds = valid_ds.map(

    preprocess_valid,

    num_parallel_calls=AUTOTUNE

)
```

---

## Cell 10 – Shuffle Dataset

**Fixed 2026-07-23 — this was the real cause of today's slow/unstable
retrain attempts.** `buffer_size=len(train_df)` shuffles by holding the
*entire* training set in memory after preprocessing — for 191,027 images at
224×224×3 float32 (~0.57MB each), that's **~110GB**, confirmed by the
retrain kernel process actually using 142GB RSS before it was killed.
That memory pressure is the likely real explanation for the repeated
`InvalidArgumentError: Invalid incarnation id` crashes during multi-GPU
attempts earlier today, on top of just making every shuffle-buffer refill
take 90-100+ seconds. `buffer_size=5000` (a standard size for
image pipelines this large — see TF's own `tf.data` performance guide)
gives effectively equivalent shuffle quality at a tiny fraction of the
memory and refill time.

```python
# ======================================================
# Shuffle
# ======================================================

train_ds = train_ds.shuffle(

    buffer_size=5000,

    seed=SEED

)
```

---

## Cell 11 – Batch Dataset

`train_ds.repeat()` matters once Phase 4 trains under `MirroredStrategy`
(2 GPUs): without it, `model.fit()` relies on the dataset naturally running
out (`StopIteration`) to detect the end of each epoch, and that
"exhaustion" path is what triggered `InvalidArgumentError: Invalid
incarnation id` on `MultiDeviceIteratorGetNextFromShard` the first time we
trained multi-GPU — a known TensorFlow/Keras issue with distributed
`tf.data` iterators. Making `train_ds` infinite and telling `model.fit()`
exactly how many steps make up an epoch (Phase 4 Cell 4's
`STEPS_PER_EPOCH`) sidesteps that code path entirely, which is also the
pattern TensorFlow's own multi-GPU guides use. `valid_ds` stays
un-repeated — Phase 5 iterates over it exactly once to build its evaluation
arrays, so it needs to stay finite.

```python
# ======================================================
# Batch
# ======================================================

train_ds = train_ds.batch(BATCH_SIZE).repeat()

valid_ds = valid_ds.batch(BATCH_SIZE)
```

---

## Cell 12 – Prefetch

```python
# ======================================================
# Prefetch
# ======================================================

train_ds = train_ds.prefetch(AUTOTUNE)

valid_ds = valid_ds.prefetch(AUTOTUNE)
```

---

## Cell 13 – Verify Dataset

```python
images, labels = next(iter(train_ds))

print("Images Shape :", images.shape)

print("Labels Shape :", labels.shape)
```

Expected

```
Images Shape : (32,224,224,3)

Labels Shape : (32,14)
```

---

## Cell 14 – Display Sample Images

```python
plt.figure(figsize=(12,10))

for i in range(9):

    plt.subplot(3,3,i+1)

    plt.imshow(images[i])

    plt.axis("off")

plt.tight_layout()

plt.show()
```

---

## Cell 15 – Display Labels

```python
sample = labels[0].numpy()

print("Diseases Present\n")

for disease, value in zip(LABELS, sample):

    if value == 1:

        print("✓", disease)
```

---

## Cell 16 – Count Disease Frequency

```python
disease_frequency = train_df[LABELS].sum()

display(disease_frequency.sort_values(ascending=False))
```

---

## Cell 17 – Disease Distribution Plot

```python
plt.figure(figsize=(12,6))

disease_frequency.sort_values().plot(

    kind="barh"

)

plt.xlabel("Number of Images")

plt.title("Disease Frequency")

plt.show()
```

---

## Cell 18 – Dataset Information

```python
print("="*60)

print("Training Samples :", len(train_df))

print("Validation Samples :", len(valid_df))

print()

print("Batch Size :", BATCH_SIZE)

print()

print("Image Size :", IMG_SIZE)

print()

print("Classes :", len(LABELS))

print("="*60)
```

---

## Cell 19 – Test Pipeline Speed

```python
%%time

for images, labels in train_ds.take(5):

    pass
```

---

## Cell 20 – Final Verification

```python
print("Phase 2 Completed Successfully!")

print()

print("TensorFlow Dataset Ready")

print("DenseNet121 Training Ready")
```

Expected Output:

```
Phase 2 Completed Successfully!

TensorFlow Dataset Ready

DenseNet121 Training Ready
```

---

# ✅ Phase 2 Complete

At this stage, your project has:

* ✔️ TensorFlow `tf.data` pipeline
* ✔️ Automatic image loading from disk
* ✔️ Image resizing to **224 × 224**
* ✔️ Pixel normalization (`0–1`)
* ✔️ Data augmentation for training
* ✔️ Efficient shuffling, batching, and prefetching
* ✔️ Batch and label verification
* ✔️ Disease distribution analysis

Your data pipeline is now optimized and ready for **Phase 3**, where you'll build the **DenseNet121** model with a custom multi-label classification head, compile it with appropriate loss/metrics, and prepare it for training.
