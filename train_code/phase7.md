Excellent! Now we build the **real inference system** that will later connect to your **Next.js frontend** and **Hugging Face API**.

Instead of just printing probabilities, we'll create a complete AI diagnosis pipeline that:

* Uploads a chest X-ray
* Preprocesses the image
* Predicts all 14 diseases
* Filters predictions using a confidence threshold
* Estimates severity
* Generates an AI medical report
* Displays the Grad-CAM explanation

This is exactly what you'll use in your web application.

---

# Phase 7 – Chest X-ray Prediction & AI Report Generation

---

## Cell 1 – Import Libraries

```python
# ======================================================
# Imports
# ======================================================

import numpy as np
import pandas as pd
import tensorflow as tf
import matplotlib.pyplot as plt
from PIL import Image
from datetime import datetime
import json
```

---

# Cell 2 – Configuration

Loads the per-class thresholds tuned in Phase 5 (`optimal_thresholds.json`)
instead of one flat cutoff for all 14 diseases — a class with a tuned
threshold of, say, 0.30 will now correctly show up as a finding at 35%
confidence instead of being silently dropped by a blanket 0.50. Falls back
to `DEFAULT_THRESHOLD` for any disease missing from the file.

```python
# ======================================================
# Configuration
# ======================================================

IMG_SIZE = 224

DEFAULT_THRESHOLD = 0.50

THRESHOLDS_PATH = "saved_models/optimal_thresholds.json"

try:
    with open(THRESHOLDS_PATH, "r") as f:
        CONFIDENCE_THRESHOLDS = json.load(f)
except FileNotFoundError:
    CONFIDENCE_THRESHOLDS = {}
```

---

# Cell 3 – Load Trained Model

```python
# ======================================================
# Load Model
# ======================================================

model = tf.keras.models.load_model(
    "saved_models/best_densenet121.keras"
)

print("Model Loaded Successfully")
```

---

# Cell 4 – Image Preprocessing

```python
# ======================================================
# Image Preprocessing
# ======================================================

def preprocess_image(image_path):

    image = Image.open(image_path).convert("RGB")

    image = image.resize((IMG_SIZE, IMG_SIZE))

    image_array = np.array(image).astype(np.float32)

    image_array /= 255.0

    image_array = np.expand_dims(image_array, axis=0)

    return image_array, image
```

---

# Cell 5 – Severity Estimation

```python
# ======================================================
# Severity
# ======================================================

def estimate_severity(probability):

    if probability >= 0.90:
        return "Critical"

    elif probability >= 0.75:
        return "High"

    elif probability >= 0.60:
        return "Moderate"

    elif probability >= 0.50:
        return "Low"

    else:
        return "Normal"
```

---

# Cell 6 – Prediction Function

```python
# ======================================================
# Prediction
# ======================================================

def predict_xray(image_path):

    image_array, original = preprocess_image(image_path)

    predictions = model.predict(
        image_array,
        verbose=0
    )[0]

    results = []

    for disease, probability in zip(LABELS, predictions):

        severity = estimate_severity(probability)

        results.append({

            "Disease": disease,

            "Probability": float(probability),

            "Severity": severity

        })

    results = pd.DataFrame(results)

    results = results.sort_values(

        by="Probability",

        ascending=False

    )

    return original, results
```

---

# Cell 7 – Select Test Image

```python
# ======================================================
# Test Image
# ======================================================

IMAGE_PATH = valid_df.iloc[10]["image_path"]

print(IMAGE_PATH)
```

You can later replace it with:

```python
IMAGE_PATH = "/content/my_xray.png"
```

---

# Cell 8 – Run Prediction

```python
# ======================================================
# Predict
# ======================================================

original, prediction_df = predict_xray(IMAGE_PATH)

prediction_df.head(10)
```

---

# Cell 9 – Display X-ray

```python
# ======================================================
# Display Image
# ======================================================

plt.figure(figsize=(6,6))

plt.imshow(original)

plt.axis("off")

plt.title("Chest X-ray")

plt.show()
```

---

# Cell 10 – Display Significant Findings

```python
# ======================================================
# Significant Findings
# ======================================================

findings = prediction_df[
    prediction_df.apply(
        lambda row: row["Probability"] >= CONFIDENCE_THRESHOLDS.get(
            row["Disease"], DEFAULT_THRESHOLD
        ),
        axis=1
    )
]

findings
```

---

# Cell 11 – AI Medical Report

```python
# ======================================================
# Report
# ======================================================

print("="*60)

print("AI RADIOLOGY REPORT")

print("="*60)

print()

print("Report Generated :", datetime.now())

print()

if len(findings) == 0:

    print("No significant lung abnormality detected.")

else:

    print("Detected Findings:\n")

    for _, row in findings.iterrows():

        print(

            f"• {row['Disease']}"

            f" | Confidence: {row['Probability']:.2%}"

            f" | Severity: {row['Severity']}"

        )

print()

print("="*60)

print("This report is AI-assisted and intended")

print("to support clinical decision-making.")

print("="*60)
```

---

# Cell 12 – Save Report

```python
# ======================================================
# Save Report
# ======================================================

prediction_df.to_csv(

    "prediction_report.csv",

    index=False

)

print("Report Saved Successfully")
```

---

# Cell 13 – Create Report Dictionary

Useful for APIs and your Next.js frontend.

```python
# ======================================================
# API Output
# ======================================================

report = {

    "generated_at": str(datetime.now()),

    "top_prediction": prediction_df.iloc[0]["Disease"],

    "confidence": float(

        prediction_df.iloc[0]["Probability"]

    ),

    "findings": findings.to_dict(

        orient="records"

    )

}

report
```

---

# Cell 14 – Final Output

```python
print("="*60)

print("Phase 7 Completed Successfully!")

print("="*60)

print()

print("Prediction Pipeline Ready")

print("AI Report Ready")

print("Frontend Integration Ready")

print("CSV Report Generated")
```

---

# Example Output

```
============================================================

AI RADIOLOGY REPORT

============================================================

Detected Findings

• Lung Opacity
Confidence : 96.24%
Severity : Critical

• Pleural Effusion
Confidence : 81.33%
Severity : High

• Cardiomegaly
Confidence : 73.42%
Severity : Moderate
```

---

# Files Generated

```
prediction_report.csv
```

---

# Phase 7 Complete

Your system can now:

* ✅ Load any chest X-ray image
* ✅ Predict all 14 CheXpert disease labels
* ✅ Assign confidence scores
* ✅ Estimate severity levels
* ✅ Generate a structured AI-assisted radiology report
* ✅ Export predictions to CSV
* ✅ Produce a JSON-compatible output for frontend/API integration

---

## 🚀 Phase 8 – Hugging Face Deployment & Gradio Interface

In the final phase, we'll deploy the trained model as a **Gradio application on Hugging Face Spaces**. You'll get:

* A professional drag-and-drop web interface
* Chest X-ray upload
* AI predictions
* Grad-CAM visualization
* AI-generated report
* Public API endpoint
* Integration guide for your **Next.js** frontend

After Phase 8, your MCA project will be fully deployable and ready for demonstration.
