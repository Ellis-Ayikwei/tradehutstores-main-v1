"""
embedding_service/main.py

Standalone FastAPI service that runs CLIP inference.
Deploy separately from Django so the 600MB model doesn't bloat web workers.

Run:
    uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2

Docker:
    docker build -t tradehut-embedding-service .
    docker run -p 8001:8001 tradehut-embedding-service

Set EMBEDDING_SERVICE_URL=http://embedding-service:8001 in your Django env.
"""

import logging
from io import BytesIO

import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from transformers import CLIPModel, CLIPProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Model loading ─────────────────────────────────────────────────────────────
# Loaded once at startup — stays in memory for the process lifetime.
# On GPU machines this is fast; on CPU expect ~5s startup time.

MODEL_NAME = "openai/clip-vit-base-patch32"
device     = "cuda" if torch.cuda.is_available() else "cpu"

logger.info("Loading %s on %s...", MODEL_NAME, device)
model     = CLIPModel.from_pretrained(MODEL_NAME).to(device)
processor = CLIPProcessor.from_pretrained(MODEL_NAME)
model.eval()
logger.info("Model ready.")

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="TradeHut Embedding Service",
    description="CLIP image and text embeddings",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dimensions: int
    model: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "device": device, "model": MODEL_NAME}


@app.post("/embed/image", response_model=EmbeddingResponse)
async def embed_image(file: UploadFile = File(...)):
    """
    Upload an image file → returns its CLIP embedding.
    Accepts: image/jpeg, image/png, image/webp
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    data  = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Max 10MB.")

    try:
        img    = Image.open(BytesIO(data)).convert("RGB")
        inputs = processor(images=img, return_tensors="pt").to(device)

        with torch.no_grad():
            features = model.get_image_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)

        vec = features.cpu().numpy()[0].tolist()
    except Exception as e:
        logger.exception("Image embedding failed")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    return EmbeddingResponse(embedding=vec, dimensions=len(vec), model=MODEL_NAME)


@app.get("/embed/text", response_model=EmbeddingResponse)
def embed_text(q: str):
    """
    Text query → CLIP embedding in the same vector space as image embeddings.
    Enables text-to-visual search: q='red leather sofa' finds visually matching products.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        inputs = processor(text=[q], return_tensors="pt", padding=True).to(device)

        with torch.no_grad():
            features = model.get_text_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)

        vec = features.cpu().numpy()[0].tolist()
    except Exception as e:
        logger.exception("Text embedding failed")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    return EmbeddingResponse(embedding=vec, dimensions=len(vec), model=MODEL_NAME)


@app.post("/embed/batch", response_model=list[EmbeddingResponse])
async def embed_batch(files: list[UploadFile] = File(...)):
    """
    Batch image embedding — more efficient than calling /embed/image in a loop.
    Max 32 images per request.
    """
    if len(files) > 32:
        raise HTTPException(status_code=400, detail="Max 32 images per batch.")

    images = []
    for f in files:
        data = await f.read()
        images.append(Image.open(BytesIO(data)).convert("RGB"))

    inputs = processor(images=images, return_tensors="pt").to(device)
    with torch.no_grad():
        features = model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)

    vecs = features.cpu().numpy()
    return [
        EmbeddingResponse(embedding=vecs[i].tolist(), dimensions=vecs.shape[1], model=MODEL_NAME)
        for i in range(len(images))
    ]
