Excellent. This is where your project becomes much more impressive. **Grad-CAM (Gradient-weighted Class Activation Mapping)** helps explain *why* the model predicted a disease by highlighting the important regions in the chest X-ray. This is especially valuable for medical AI projects.

---

# Phase 6 – Explainable AI with Grad-CAM

---

## Cell 1 – Import Libraries

```python
# ======================================================
# Imports
# ======================================================

import cv2
import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt

from tensorflow.keras.models import Model
```

---

# Cell 2 – Find the Backbone & Last Convolutional Layer

`best_model` wraps the DenseNet121 backbone as a **nested sub-model**
(Phase 3 builds it via `x = base_model(x, training=False)`), so the
convolutional layers live *inside* that nested model — they are not direct
layers of `best_model`. We first find the nested backbone, then search
inside it.

```python
# ======================================================
# Locate Backbone & Last Convolution Layer
# ======================================================

BACKBONE_NAME = None

for layer in best_model.layers:

    if isinstance(layer, tf.keras.Model):

        BACKBONE_NAME = layer.name

        break

if BACKBONE_NAME is None:
    raise ValueError("Could not find a nested backbone model inside best_model.")

backbone = best_model.get_layer(BACKBONE_NAME)

backbone_layer_names = [l.name for l in backbone.layers]

if "conv5_block16_concat" in backbone_layer_names:

    LAST_CONV_LAYER = "conv5_block16_concat"

else:

    LAST_CONV_LAYER = None

    for layer in reversed(backbone.layers):

        if isinstance(layer, tf.keras.layers.Conv2D):

            LAST_CONV_LAYER = layer.name

            break

print("Backbone:", BACKBONE_NAME)
print("Last Conv Layer:", LAST_CONV_LAYER)
```

Expected output:

```
Backbone: densenet121
Last Conv Layer: conv5_block16_concat
```

---

# Cell 3 – Create Grad-CAM Function

Because the backbone is nested, we can't build a single `grad_model` from
`model.get_layer(last_conv_layer_name)` the way a flat (non-nested)
architecture would allow — that only searches `model`'s direct children.
Instead we rebuild the forward pass in two pieces: **(1)** backbone input →
last conv layer output, and **(2)** that output fed through whichever
layers come *after* the backbone in `model.layers` (GlobalAveragePooling2D,
BatchNormalization, Dense, Dropout, the sigmoid output layer). Gradients are
then taken across both pieces together inside one `GradientTape`.

```python
# ======================================================
# Grad-CAM Function (nested-model safe)
# ======================================================

def make_gradcam_heatmap(
    image,
    model,
    last_conv_layer_name,
    pred_index=None
):

    backbone = None
    backbone_index = None

    for i, layer in enumerate(model.layers):

        if isinstance(layer, tf.keras.Model):

            backbone = layer

            backbone_index = i

            break

    if backbone is None:
        raise ValueError("No nested backbone model found inside `model`.")

    last_conv_layer = backbone.get_layer(last_conv_layer_name)

    last_conv_layer_model = Model(
        backbone.input,
        last_conv_layer.output
    )

    classifier_input = tf.keras.Input(
        shape=last_conv_layer.output.shape[1:]
    )

    x = classifier_input

    for layer in model.layers[backbone_index + 1:]:

        x = layer(x)

    classifier_model = Model(classifier_input, x)

    with tf.GradientTape() as tape:

        conv_outputs = last_conv_layer_model(image)

        tape.watch(conv_outputs)

        predictions = classifier_model(conv_outputs)

        if pred_index is None:
            pred_index = tf.argmax(predictions[0])

        class_channel = predictions[:, pred_index]

    grads = tape.gradient(
        class_channel,
        conv_outputs
    )

    pooled_grads = tf.reduce_mean(
        grads,
        axis=(0,1,2)
    )

    conv_outputs = conv_outputs[0]

    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]

    heatmap = tf.squeeze(heatmap)

    heatmap = tf.maximum(
        heatmap,
        0
    ) / tf.math.reduce_max(heatmap)

    return heatmap.numpy()
```

---

# Cell 4 – Load an Image

```python
# ======================================================
# Select Image
# ======================================================

sample_path = valid_df.iloc[0]["image_path"]

print(sample_path)
```

---

# Cell 5 – Preprocess Image

```python
# ======================================================
# Preprocess
# ======================================================

img = tf.keras.preprocessing.image.load_img(
    sample_path,
    target_size=(224,224)
)

img_array = tf.keras.preprocessing.image.img_to_array(img)

img_array = img_array / 255.0

img_array = np.expand_dims(
    img_array,
    axis=0
)
```

---

# Cell 6 – Predict Diseases

```python
# ======================================================
# Prediction
# ======================================================

prediction = best_model.predict(img_array)

prediction = prediction[0]

prediction_df = pd.DataFrame({

    "Disease": LABELS,

    "Probability": prediction

})

prediction_df = prediction_df.sort_values(
    by="Probability",
    ascending=False
)

prediction_df.head(10)
```

---

# Cell 7 – Generate Heatmap

```python
# ======================================================
# Grad-CAM
# ======================================================

predicted_class = np.argmax(prediction)

heatmap = make_gradcam_heatmap(

    img_array,

    best_model,

    LAST_CONV_LAYER,

    pred_index=predicted_class

)

heatmap = np.asarray(heatmap, dtype=np.float32)

plt.imshow(heatmap)

plt.colorbar()

plt.title("Grad-CAM Heatmap")

plt.show()
```

---

# Cell 8 – Overlay Heatmap

```python
# ======================================================
# Overlay
# ======================================================

original = cv2.imread(sample_path)

original = cv2.cvtColor(
    original,
    cv2.COLOR_BGR2RGB
)

original = cv2.resize(
    original,
    (224,224)
)

heatmap = cv2.resize(
    heatmap,
    (224,224)
)

heatmap = np.uint8(255 * heatmap)

heatmap = cv2.applyColorMap(
    heatmap,
    cv2.COLORMAP_JET
)

superimposed = cv2.addWeighted(

    original,

    0.6,

    heatmap,

    0.4,

    0

)
```

---

# Cell 9 – Display Results

```python
# ======================================================
# Visualization
# ======================================================

plt.figure(figsize=(15,5))

plt.subplot(1,3,1)

plt.imshow(original)

plt.title("Original")

plt.axis("off")

plt.subplot(1,3,2)

plt.imshow(heatmap)

plt.title("Heatmap")

plt.axis("off")

plt.subplot(1,3,3)

plt.imshow(superimposed)

plt.title("Grad-CAM")

plt.axis("off")

plt.show()
```

---

# Cell 10 – Display Predicted Diseases

Uses the per-class thresholds tuned in Phase 5 (`optimal_thresholds.json`)
instead of a single 0.50 cutoff for every disease — falls back to 0.50 for
any disease missing from the file (e.g. if Phase 5 hasn't been run yet).

```python
# ======================================================
# Predictions
# ======================================================

import json

try:
    with open("saved_models/optimal_thresholds.json", "r") as f:
        thresholds = json.load(f)
except FileNotFoundError:
    thresholds = {}

print("Predicted Diseases\n")

for disease, prob in zip(

    LABELS,

    prediction

):

    disease_threshold = thresholds.get(disease, 0.50)

    if prob >= disease_threshold:

        print(f"✓ {disease} : {prob:.2%} (threshold {disease_threshold:.0%})")
```

---

# Cell 11 – Save Image

```python
# ======================================================
# Save
# ======================================================

plt.imsave(

    "gradcam_result.png",

    superimposed

)

print("Saved Successfully")
```

---

# Cell 12 – Test Multiple Images

```python
# ======================================================
# Random Samples
# ======================================================

sample_images = valid_df.sample(
    5,
    random_state=42
)

sample_images[["image_path"]]
```

---

# Cell 13 – Phase Complete

```python
print("="*60)

print("Phase 6 Completed Successfully!")

print("="*60)

print()

print("Grad-CAM Generated")

print("Explainable AI Enabled")

print("Medical Visualization Ready")

print("Image Saved")
```

---

# 📁 Output

```
gradcam_result.png
```

---

# ✅ Phase 6 Complete

You now have:

* ✔️ Explainable AI using Grad-CAM
* ✔️ Heatmap visualization
* ✔️ Overlay on the original chest X-ray
* ✔️ Disease probability table
* ✔️ Exportable Grad-CAM image

This is a significant enhancement for your project because it provides clinicians with a visual explanation of the model's predictions.

---

## ✅ Nested-Model Issue Resolved

Earlier drafts of this phase called `model.get_layer(last_conv_layer_name)`
directly, which fails whenever the backbone is nested (as it is here, from
Phase 3's `x = base_model(x, training=False)`). Cells 2–3 above now locate
the nested backbone first and rebuild the forward pass in two pieces
(backbone → last conv layer, then the remaining classifier layers), so
Grad-CAM works correctly against the real nested architecture — no changes
to Phase 3 required. You can generate Grad-CAM for **any of the 14
diseases** by passing a different `pred_index` to `make_gradcam_heatmap`.

---

## 🚀 Next: Phase 7 – Prediction & AI Report Generation

In the next phase, we'll build the inference pipeline that:

* Accepts any uploaded chest X-ray.
* Predicts probabilities for all 14 disease labels.
* Generates a structured AI medical report.
* Displays the Grad-CAM overlay.
* Produces a PDF-style report suitable for your web application.
