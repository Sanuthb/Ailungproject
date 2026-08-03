"""Image preprocessing, matching training-time preprocessing exactly.

The saved model has no Rescaling/Normalization layer baked in (verified against
its config.json), so the /255.0 step below must happen here. No ImageNet
mean/std subtraction and no `densenet.preprocess_input` — training used a
plain 0-1 rescale only.
"""

import numpy as np
from PIL import Image

IMG_SIZE = 224


def load_and_preprocess(image: Image.Image) -> np.ndarray:
    """Takes a PIL image, returns a (1, 224, 224, 3) float32 array ready for the model."""
    image = image.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
    array = np.array(image).astype(np.float32) / 255.0
    return np.expand_dims(array, axis=0)
