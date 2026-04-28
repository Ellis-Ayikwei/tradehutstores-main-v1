"""
apps.search.embedding

CLIP embedding helpers.

Loads the model lazily and keeps it in memory for the rest of the process.

In production we recommend running a dedicated FastAPI embedding service (see
``tradehut_search/embedding_service``) and pointing ``EMBEDDING_SERVICE_URL`` at
it. When ``EMBEDDING_SERVICE_URL`` is set, this module makes HTTP calls
instead of running CLIP locally — useful so Django web workers stay light.
"""

from __future__ import annotations

import hashlib
import logging
from io import BytesIO
from typing import Optional

logger = logging.getLogger(__name__)

# Lazily populated on first call.
_model = None
_processor = None
_device: Optional[str] = None

MODEL_NAME = "openai/clip-vit-base-patch32"
EMBEDDING_DIM = 512


def _load_local_model():
    """Import torch + transformers and load CLIP. Heavy — ~600MB on first run."""
    global _model, _processor, _device

    if _model is not None:
        return _model, _processor

    import torch
    from transformers import CLIPModel, CLIPProcessor

    _device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Loading CLIP %s on %s ...", MODEL_NAME, _device)
    _model = CLIPModel.from_pretrained(MODEL_NAME).to(_device)
    _processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    _model.eval()
    return _model, _processor


def _embedding_service_url() -> Optional[str]:
    from django.conf import settings

    return getattr(settings, "EMBEDDING_SERVICE_URL", None) or None


# ─── Public API ───────────────────────────────────────────────────────────────


def embed_image_bytes(data: bytes):
    """
    Convert image bytes -> 512-dim float32 numpy vector (L2 normalised).
    """
    import numpy as np

    url = _embedding_service_url()
    if url:
        import httpx

        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{url}/embed/image",
                files={"file": ("image.jpg", data, "image/jpeg")},
            )
        resp.raise_for_status()
        return np.asarray(resp.json()["embedding"], dtype=np.float32)

    import torch
    from PIL import Image

    model, processor = _load_local_model()
    img = Image.open(BytesIO(data)).convert("RGB")
    inputs = processor(images=img, return_tensors="pt").to(_device)
    with torch.no_grad():
        feats = model.get_image_features(**inputs)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().numpy()[0].astype(np.float32)


def embed_text(text: str):
    """Embed a text string into the same vector space as ``embed_image_bytes``."""
    import numpy as np

    url = _embedding_service_url()
    if url:
        import httpx

        with httpx.Client(timeout=30) as client:
            resp = client.get(f"{url}/embed/text", params={"q": text})
        resp.raise_for_status()
        return np.asarray(resp.json()["embedding"], dtype=np.float32)

    import torch

    model, processor = _load_local_model()
    inputs = processor(text=[text], return_tensors="pt", padding=True).to(_device)
    with torch.no_grad():
        feats = model.get_text_features(**inputs)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.cpu().numpy()[0].astype(np.float32)


def hash_image_bytes(data: bytes) -> str:
    """Stable per-image identifier — used as a cache key and for skip-on-resave."""
    return hashlib.sha256(data).hexdigest()
