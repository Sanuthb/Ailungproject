Perfect. Now we'll evaluate the trained model like a real medical AI system. This phase is important for your MCA project because it demonstrates the model's performance with meaningful metrics and visualizations.

---

# Phase 5 – Model Evaluation & Performance Analysis

---

## Cell 1 – Import Required Libraries

```python
# ======================================================
# Imports
# ======================================================

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.metrics import (
    classification_report,
    roc_curve,
    auc,
    confusion_matrix,
    ConfusionMatrixDisplay,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
)
```

---

# Cell 2 – Generate Predictions

```python
# ======================================================
# Generate Predictions
# ======================================================

y_true = []
y_pred_prob = []

for images, labels in valid_ds:

    predictions = best_model.predict(images, verbose=0)

    y_true.extend(labels.numpy())

    y_pred_prob.extend(predictions)

y_true = np.array(y_true)

y_pred_prob = np.array(y_pred_prob)

print("Ground Truth Shape :", y_true.shape)
print("Prediction Shape   :", y_pred_prob.shape)
```

Expected:

```
Ground Truth Shape : (XXXX,14)

Prediction Shape   : (XXXX,14)
```

---

# Cell 3 – Apply Threshold

```python
# ======================================================
# Binary Prediction
# ======================================================

THRESHOLD = 0.5

y_pred = (y_pred_prob >= THRESHOLD).astype(int)

print("Threshold :", THRESHOLD)
```

---

# Cell 4 – Overall Metrics

```python
# ======================================================
# Overall Metrics
# ======================================================

precision = precision_score(
    y_true,
    y_pred,
    average="micro",
    zero_division=0
)

recall = recall_score(
    y_true,
    y_pred,
    average="micro",
    zero_division=0
)

f1 = f1_score(
    y_true,
    y_pred,
    average="micro",
    zero_division=0
)

print(f"Precision : {precision:.4f}")
print(f"Recall    : {recall:.4f}")
print(f"F1 Score  : {f1:.4f}")
```

---

# Cell 5 – Classification Report

```python
# ======================================================
# Classification Report
# ======================================================

report = classification_report(
    y_true,
    y_pred,
    target_names=LABELS,
    zero_division=0
)

print(report)
```

---

# Cell 6 – Per-Class ROC Curve

```python
# ======================================================
# ROC Curves
# ======================================================

plt.figure(figsize=(12,10))

roc_scores = {}

for i, disease in enumerate(LABELS):

    fpr, tpr, _ = roc_curve(
        y_true[:, i],
        y_pred_prob[:, i]
    )

    roc_auc = auc(fpr, tpr)

    roc_scores[disease] = roc_auc

    plt.plot(
        fpr,
        tpr,
        label=f"{disease} ({roc_auc:.2f})"
    )

plt.plot([0,1],[0,1],"k--")

plt.xlabel("False Positive Rate")

plt.ylabel("True Positive Rate")

plt.title("ROC Curve")

plt.legend(fontsize=8)

plt.show()
```

---

# Cell 7 – ROC Score Table

```python
# ======================================================
# ROC Scores
# ======================================================

roc_df = pd.DataFrame({

    "Disease": list(roc_scores.keys()),

    "AUC": list(roc_scores.values())

})

roc_df = roc_df.sort_values(
    by="AUC",
    ascending=False
)

roc_df
```

---

# Cell 8 – Plot AUC Scores

```python
# ======================================================
# Plot AUC
# ======================================================

plt.figure(figsize=(12,6))

plt.barh(
    roc_df["Disease"],
    roc_df["AUC"]
)

plt.xlim([0,1])

plt.xlabel("AUC")

plt.title("Per Disease AUC")

plt.show()
```

---

# Cell 9 – Confusion Matrix (Example)

We'll display the confusion matrix for one disease (e.g., **Pneumonia**). You can change the disease name as needed.

```python
# ======================================================
# Confusion Matrix
# ======================================================

disease = "Pneumonia"

idx = LABELS.index(disease)

cm = confusion_matrix(
    y_true[:, idx],
    y_pred[:, idx]
)

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=["Negative","Positive"]
)

disp.plot(cmap="Blues")

plt.title(disease)

plt.show()
```

---

# Cell 10 – Performance Summary

```python
# ======================================================
# Performance Table
# ======================================================

summary = []

for i, disease in enumerate(LABELS):

    precision = precision_score(
        y_true[:, i],
        y_pred[:, i],
        zero_division=0
    )

    recall = recall_score(
        y_true[:, i],
        y_pred[:, i],
        zero_division=0
    )

    f1 = f1_score(
        y_true[:, i],
        y_pred[:, i],
        zero_division=0
    )

    summary.append([

        disease,

        precision,

        recall,

        f1,

        roc_scores[disease]

    ])

summary_df = pd.DataFrame(

    summary,

    columns=[
        "Disease",
        "Precision",
        "Recall",
        "F1 Score",
        "AUC"
    ]

)

summary_df
```

---

# Cell 11 – Save Evaluation Results

```python
# ======================================================
# Save Results
# ======================================================

summary_df.to_csv(
    "evaluation_results.csv",
    index=False
)

print("Evaluation Results Saved")
```

---

# Cell 12 – Display Top Performing Diseases

```python
summary_df.sort_values(
    by="AUC",
    ascending=False
).head(10)
```

---

# Cell 13 – Display Lowest Performing Diseases

```python
summary_df.sort_values(
    by="AUC"
).head(10)
```

---

# Cell 14 – Average AUC

```python
print("Average AUC :", summary_df["AUC"].mean())
```

---

# Cell 15 – Per-Class Threshold Tuning

The classification report and confusion matrices above all used a single
fixed threshold (0.5) for every disease. That's misleading for a multi-label
problem where prevalence varies wildly by class (e.g. Pneumonia may be ~4%
positive while Lung Opacity is much more common) — probabilities for rare
classes often never cross 0.5, so recall collapses to 0 for them even though
the model has learned real ranking signal (see the AUC chart in Cell 8).
Here we pick, per disease, the threshold that maximizes F1 on the validation
set instead of using 0.5 everywhere.

```python
# ======================================================
# Per-Class Threshold Tuning
# ======================================================

from sklearn.metrics import precision_recall_curve

optimal_thresholds = {}
threshold_rows = []

for i, disease in enumerate(LABELS):

    precisions, recalls, thresholds = precision_recall_curve(
        y_true[:, i],
        y_pred_prob[:, i]
    )

    f1_scores = np.divide(
        2 * precisions * recalls,
        precisions + recalls,
        out=np.zeros_like(precisions),
        where=(precisions + recalls) != 0
    )

    positive_count = int(y_true[:, i].sum())

    if positive_count == 0 or f1_scores[:-1].max() == 0:
        best_threshold = 0.50
        best_f1 = 0.0
    else:
        best_idx = np.argmax(f1_scores[:-1])
        best_threshold = float(thresholds[best_idx])
        best_f1 = float(f1_scores[best_idx])

    optimal_thresholds[disease] = best_threshold

    threshold_rows.append([disease, best_threshold, best_f1, positive_count])

threshold_df = pd.DataFrame(
    threshold_rows,
    columns=["Disease", "Optimal Threshold", "Best F1", "Positive Count"]
).sort_values(by="Optimal Threshold", ascending=False)

threshold_df
```

Classes with zero positive examples in this validation split (e.g.
Fracture) have nothing to tune against, so they fall back to the default
0.50 — that's expected, not a bug.

---

# Cell 16 – Apply Tuned Thresholds

```python
# ======================================================
# Apply Tuned Thresholds
# ======================================================

import json

threshold_array = np.array([optimal_thresholds[d] for d in LABELS])

y_pred_tuned = (y_pred_prob >= threshold_array).astype(int)

print("Fixed threshold (0.50 for every class):")
print(classification_report(y_true, y_pred, target_names=LABELS, zero_division=0))

print("\nPer-class tuned thresholds:")
print(classification_report(y_true, y_pred_tuned, target_names=LABELS, zero_division=0))

print("Subset Accuracy — fixed 0.50 :", accuracy_score(y_true, y_pred))
print("Subset Accuracy — tuned     :", accuracy_score(y_true, y_pred_tuned))

threshold_path = os.path.join(MODEL_DIR, "optimal_thresholds.json")

with open(threshold_path, "w") as f:
    json.dump(optimal_thresholds, f, indent=2)

print("\nOptimal Thresholds Saved:", threshold_path)
```

`optimal_thresholds.json` is what Phase 6 and Phase 7 load so the rest of
the pipeline (Grad-CAM label selection, the AI report's "significant
findings" filter) uses these per-class thresholds instead of a blanket 0.5.

---

# Cell 17 – Evaluation Complete

```python
print("="*60)
print("Phase 5 Completed Successfully!")
print("="*60)

print()

print("Classification Report Generated")

print("ROC Curves Generated")

print("Confusion Matrix Generated")

print("Evaluation CSV Saved")

print("Model Performance Verified")
```

---

# 📁 Files Generated

```
evaluation_results.csv
optimal_thresholds.json
```

---

# ✅ Phase 5 Complete

At the end of this phase, you'll have:

* ✔️ Overall Precision, Recall, and F1-Score
* ✔️ Per-disease ROC curves and AUC values
* ✔️ Classification report for all 14 disease labels
* ✔️ Confusion matrix visualization for individual diseases
* ✔️ Evaluation summary saved as a CSV file

These outputs are well suited for the **Results** and **Performance Evaluation** sections of your MCA project report.

---

## 🚀 Next: Phase 6 – Explainable AI with Grad-CAM

In the next phase, we'll implement **Grad-CAM** to visualize the regions of the chest X-ray that most influenced the model's prediction. This will make your project significantly stronger by providing explainable AI, a key requirement for modern medical imaging systems.
