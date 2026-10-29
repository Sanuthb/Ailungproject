# Run on the AI server:  cd ~/ailung/notebooks && python make_roc.py
# Creates ROC curves + per-label AUC from the CheXpert validation set.
import os, json, numpy as np, pandas as pd, tensorflow as tf, kagglehub
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, roc_auc_score

import sys
MODEL = sys.argv[1] if len(sys.argv) > 1 else "saved_models/best_densenet121.keras"
OUT = "saved_models"
LABELS = ["No Finding","Enlarged Cardiomediastinum","Cardiomegaly","Lung Opacity","Lung Lesion",
          "Edema","Consolidation","Pneumonia","Atelectasis","Pneumothorax","Pleural Effusion",
          "Pleural Other","Fracture","Support Devices"]

root = kagglehub.dataset_download("ashery/chexpert")
df = pd.read_csv(os.path.join(root, "valid.csv"))
df[LABELS] = df[LABELS].fillna(0).replace(-1, 0)
df = df[df["Frontal/Lateral"] == "Frontal"].reset_index(drop=True)
df["p"] = df["Path"].str.replace("CheXpert-v1.0-small/", "", regex=False).apply(lambda x: os.path.join(root, x))

def load(p):
    img = tf.image.decode_jpeg(tf.io.read_file(p), channels=3)
    return tf.image.resize(img, (224, 224)) / 255.0

ds = tf.data.Dataset.from_tensor_slices(df["p"].values).map(load).batch(32)
model = tf.keras.models.load_model(MODEL, compile=False)
pred = model.predict(ds).astype("float32")
y = df[LABELS].values

fig, axes = plt.subplots(3, 5, figsize=(18, 10)); axes = axes.ravel()
rows, aucs = [], {}
for i, lab in enumerate(LABELS):
    ax = axes[i]
    if y[:, i].sum() == 0 or y[:, i].sum() == len(y):
        ax.set_title(f"{lab}\n(no positives - n/a)"); ax.axis("off"); continue
    fpr, tpr, thr = roc_curve(y[:, i], pred[:, i]); auc = roc_auc_score(y[:, i], pred[:, i])
    aucs[lab] = auc
    ax.plot(fpr, tpr, lw=2, label=f"AUC={auc:.3f}"); ax.plot([0,1],[0,1],"k--",lw=1)
    ax.set_title(lab); ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate"); ax.legend(loc="lower right")
    rows += [(lab, a, b, t) for a, b, t in zip(fpr, tpr, thr)]
axes[14].axis("off")
plt.tight_layout(); plt.savefig(f"{OUT}/roc_curves.png", dpi=200)

# overlay of all labels
plt.figure(figsize=(7, 6))
for lab, a in aucs.items():
    f, t, _ = roc_curve(y[:, LABELS.index(lab)], pred[:, LABELS.index(lab)]); plt.plot(f, t, label=f"{lab} ({a:.2f})")
plt.plot([0,1],[0,1],"k--"); plt.xlabel("False positive rate"); plt.ylabel("True positive rate")
plt.legend(fontsize=7, loc="lower right"); plt.tight_layout(); plt.savefig(f"{OUT}/roc_overlay.png", dpi=200)

pd.DataFrame(rows, columns=["label","fpr","tpr","threshold"]).to_csv(f"{OUT}/roc_points.csv", index=False)
pd.DataFrame(pred, columns=LABELS).assign(path=df["Path"]).to_csv(f"{OUT}/valid_predictions.csv", index=False)
json.dump(aucs, open(f"{OUT}/auc_per_label.json", "w"), indent=2)
print({k: round(v, 3) for k, v in aucs.items()}); print("mean AUC", round(float(np.mean(list(aucs.values()))), 3))
