"""Grad-CAM for the nested DenseNet121 backbone.

The saved model wraps DenseNet121 as a nested Functional sub-model (not
flattened into the outer model), so `model.get_layer("conv5_block16_concat")`
does not work directly on the outer model. Instead we:

1. Locate the nested backbone sub-model and its last conv layer
   ("conv5_block16_concat").
2. Build a small model from the backbone's input to that conv layer's output.
3. Rebuild everything *after* the backbone (GAP -> BN -> Dense -> ... -> sigmoid)
   as a second model taking the conv layer's output as input.
4. Run both inside one GradientTape to get gradients of the target class with
   respect to the conv feature maps, then pool + weight them (standard Grad-CAM).

The result is returned as a transparent-background RGBA PNG (base64-encoded)
so the Next.js frontend can composite it over the original X-ray with a CSS
opacity overlay, rather than a pre-blended flat image.
"""

import base64
import io

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.models import Model

LAST_CONV_LAYER_NAME = "conv5_block16_concat"


def _find_backbone(model: tf.keras.Model):
    for index, layer in enumerate(model.layers):
        if isinstance(layer, tf.keras.Model):
            return layer, index
    raise ValueError("No nested backbone sub-model found on the outer model.")


def build_gradcam_models(model: tf.keras.Model):
    """Builds the (conv_output_model, classifier_model) pair used for every Grad-CAM call."""
    backbone, backbone_index = _find_backbone(model)
    last_conv_layer = backbone.get_layer(LAST_CONV_LAYER_NAME)
    conv_output_model = Model(backbone.input, last_conv_layer.output)

    classifier_input = tf.keras.Input(shape=last_conv_layer.output.shape[1:])
    x = classifier_input
    for layer in model.layers[backbone_index + 1 :]:
        x = layer(x)
    classifier_model = Model(classifier_input, x)

    return conv_output_model, classifier_model


def compute_heatmap(
    conv_output_model: tf.keras.Model,
    classifier_model: tf.keras.Model,
    image_array: np.ndarray,
    pred_index: int | None = None,
) -> np.ndarray:
    """Returns a (h, w) heatmap in [0, 1], where h/w match the conv layer's output resolution."""
    image_tensor = tf.convert_to_tensor(image_array)

    with tf.GradientTape() as tape:
        conv_outputs = conv_output_model(image_tensor)
        tape.watch(conv_outputs)
        predictions = classifier_model(conv_outputs)
        if pred_index is None:
            pred_index = int(tf.argmax(predictions[0]))
        class_channel = predictions[:, pred_index]

    grads = tape.gradient(class_channel, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
    return heatmap.numpy()


def heatmap_to_transparent_overlay(heatmap: np.ndarray, target_size: tuple[int, int]) -> str:
    """Colorizes a heatmap and resizes it to `target_size` (w, h), returning a base64 RGBA PNG.

    Activation intensity drives both the color (JET colormap) and the alpha
    channel, so low-activation regions are fully transparent and the overlay
    can be layered directly on top of the original image in the browser.
    """
    heatmap_uint8 = np.uint8(255 * heatmap)
    heatmap_resized = cv2.resize(heatmap_uint8, target_size, interpolation=cv2.INTER_LINEAR)

    colored_bgr = cv2.applyColorMap(heatmap_resized, cv2.COLORMAP_JET)
    colored_rgb = cv2.cvtColor(colored_bgr, cv2.COLOR_BGR2RGB)

    alpha = heatmap_resized
    rgba = np.dstack([colored_rgb, alpha]).astype(np.uint8)

    image = Image.fromarray(rgba, mode="RGBA")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
