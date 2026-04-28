"""
products/embedding.py

CLIP embedding helpers.

Loads the model once at process startup and keeps it in memory.
In production, this module should live in the standalone embedding_service/
rather than inside Django — see README for the split architecture.

For local development and small deployments, running CLIP inside Django
(via Celery workers) is fine.

Model: openai/clip-vit-base-patch32
  - 512-dimensional output vectors
  - Multimodal: image and text share the same vector space
  - ~600MB download, cached to HF_HOME (~/.cache/huggingface/ by default)
"""

import logging
import numpy as np
import torch
from io import BytesIO
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

logger = logging.getLogger(__name__)

# ── Lazy globals — loaded once on first call ──────────────────────────────────
_model:     CLIPModel     | None = None
_processor: CLIPProcessor | None = None
_device = "cuda" if torch.cuda.is_available() else "cpu"

MODEL_NAME = "openai/clip-vit-base-patch32"
# Upgrade to "openai/clip-vit-large-patch14" for better accuracy (1.7GB, slower)


def _load() -> None:
    """Load model and processor into module-level globals."""
    global _model, _processor
    if _model is not None:
        return
    logger.info("Loading CLIP model %s on %s ...", MODEL_NAME, _device)
    _model     = CLIPModel.from_pretrained(MODEL_NAME).to(_device)
    _processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    _model.eval()
    logger.info("CLIP model loaded.")


# ── Public API ────────────────────────────────────────────────────────────────

def embed_image(image_input) -> np.ndarray:
    """
    Convert an image to a normalised 512-dim float32 vector.

    Accepts:
      - PIL.Image.Image
      - file-like object (BytesIO, Django InMemoryUploadedFile)
      - str / Path (file path)

    Returns:
      np.ndarray of shape (512,), dtype float32, L2-normalised
    """
    _load()

    if not isinstance(image_input, Image.Image):
        image_input = Image.open(image_input).convert("RGB")
    elif image_input.mode != "RGB":
        image_input = image_input.convert("RGB")

    inputs = _processor(images=image_input, return_tensors="pt").to(_device)
    with torch.no_grad():
        features = _model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)   # L2 normalise

    return features.cpu().numpy()[0].astype(np.float32)


def embed_text(text: str) -> np.ndarray:
    """
    Embed a text string into the same vector space as embed_image().

    Because CLIP is multimodal, embed_text("red sneaker") returns a vector
    close to embed_image(<photo of red sneaker>). This enables text-to-visual
    search with no extra infrastructure.

    Returns:
      np.ndarray of shape (512,), dtype float32, L2-normalised
    """
    _load()

    inputs = _processor(text=[text], return_tensors="pt", padding=True).to(_device)
    with torch.no_grad():
        features = _model.get_text_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)

    return features.cpu().numpy()[0].astype(np.float32)


def embed_image_bytes(data: bytes) -> np.ndarray:
    """Convenience wrapper for raw bytes (e.g. from cache or S3 download)."""
    return embed_image(BytesIO(data))
