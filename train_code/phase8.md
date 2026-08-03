Excellent. This is the final phase of your MCA project. We'll deploy your trained model to **Hugging Face Spaces** using **Gradio**, creating a professional web application that you can share and later integrate with your **Next.js** frontend.

---

# Phase 8 – Deploy to Hugging Face Spaces with Gradio

## Final Project Structure

Organize your project like this:

```text
lung-abnormality-ai/
│
├── app.py
├── requirements.txt
├── README.md
├── best_densenet121.keras
├── gradcam.py
├── predict.py
├── utils.py
├── labels.py
├── assets/
│   └── logo.png
└── examples/
    ├── sample1.png
    ├── sample2.png
    └── sample3.png
```

---

# Cell 1 – Install Gradio

```python
!pip install gradio opencv-python pillow
```

---

# File: `labels.py`

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

# File: `utils.py`

```python
from PIL import Image
import numpy as np

IMG_SIZE = 224

def preprocess(image):

    image = image.convert("RGB")

    image = image.resize((IMG_SIZE, IMG_SIZE))

    image = np.array(image).astype(np.float32)

    image /= 255.0

    image = np.expand_dims(image, axis=0)

    return image
```

---

# File: `predict.py`

```python
import tensorflow as tf
import pandas as pd

from labels import LABELS
from utils import preprocess

model = tf.keras.models.load_model(
    "best_densenet121.keras"
)

def predict(image):

    image_array = preprocess(image)

    pred = model.predict(
        image_array,
        verbose=0
    )[0]

    df = pd.DataFrame({

        "Disease": LABELS,

        "Confidence": pred

    })

    df = df.sort_values(

        by="Confidence",

        ascending=False

    )

    return df
```

---

# File: `app.py`

```python
import gradio as gr
from predict import predict

def inference(image):

    result = predict(image)

    report = ""

    for _, row in result.iterrows():

        if row["Confidence"] > 0.50:

            report += (
                f"{row['Disease']} "
                f"({row['Confidence']:.2%})\n"
            )

    if report == "":

        report = "No significant abnormalities detected."

    return result, report


demo = gr.Interface(

    fn=inference,

    inputs=gr.Image(type="pil"),

    outputs=[

        gr.Dataframe(),

        gr.Textbox()

    ],

    title="AI Lung Abnormality Detection",

    description="""
Upload a Chest X-ray to detect
possible lung abnormalities.
""",

    allow_flagging="never"

)

demo.launch()
```

---

# `requirements.txt`

```text
tensorflow
gradio
numpy
pandas
opencv-python-headless
Pillow
matplotlib
```

---

# `README.md`

```markdown
# AI Lung Abnormality Detection

This application detects multiple lung abnormalities from Chest X-rays using DenseNet121 trained on the CheXpert dataset.

## Features

- Multi-label disease prediction
- Confidence scores
- AI-assisted radiology report
- Chest X-ray upload
- Ready for Hugging Face deployment

## Dataset

CheXpert

## Model

DenseNet121

## Framework

TensorFlow

## Frontend

Gradio
```

---

# Upload to Hugging Face

Create a new **Gradio Space** and upload:

```text
app.py
requirements.txt
README.md
best_densenet121.keras
predict.py
utils.py
labels.py
```

Hugging Face will automatically install the dependencies and launch your application.

---

# Integration with Next.js

Once deployed, you can call the Hugging Face Space from your Next.js app:

```ts
const response = await fetch("YOUR_SPACE_URL/run/predict", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    data: [imageBase64],
  }),
});

const result = await response.json();
```

---

# Optional Improvements

For a more polished application, you can extend it with:

* Patient information form (name, age, gender, ID)
* Upload history stored in PostgreSQL
* PDF report generation
* Interactive Grad-CAM visualization
* Severity indicators (Low, Moderate, High, Critical)
* Doctor dashboard with patient history
* REST API using FastAPI
* Authentication with Clerk or NextAuth
* Docker deployment for self-hosting

---

# 🎓 MCA Project Outcome

By completing all phases, you have built:

* **AI Model:** DenseNet121 trained on CheXpert for multi-label lung abnormality detection.
* **Explainable AI:** Grad-CAM visualization for highlighting influential regions in X-rays.
* **Inference Pipeline:** Upload, preprocess, predict, and generate AI-assisted reports.
* **Evaluation:** Precision, Recall, F1-score, ROC-AUC, and confusion matrices.
* **Deployment:** A Gradio-based web application deployable on Hugging Face Spaces.
* **Integration Ready:** The deployed model can be connected to your Next.js frontend through an API.

### A recommendation before deployment

Before uploading to Hugging Face, consider refactoring the code into reusable modules (`model.py`, `predict.py`, `gradcam.py`, `report.py`) and adding proper error handling and logging. This will make the application easier to maintain, test, and extend when you integrate it into your full-stack MCA project.
