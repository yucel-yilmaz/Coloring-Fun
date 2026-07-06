import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path

import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

LOCAL_AI_HOME = Path(os.environ.get("LOCAL_AI_HOME", "/Volumes/YEDEK/Coloring-Fun-AI"))
GENERATOR_SCRIPT = Path(__file__).with_name("generate_once.py")

app = FastAPI(title="Coloring Fun Local SDXL", docs_url=None, redoc_url=None)
_generation_lock = asyncio.Lock()


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=2, max_length=8000)
    orientation: str = Field(pattern="^(portrait|landscape)$")


@app.get("/health")
def health():
    return {"ready": torch.backends.mps.is_available(), "modelLoaded": False, "device": "Apple MPS"}


async def generate_in_fresh_process(payload: GenerateRequest):
    temp_dir = LOCAL_AI_HOME / "tmp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    descriptor, output_path = tempfile.mkstemp(suffix=".png", dir=temp_dir)
    os.close(descriptor)
    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            str(GENERATOR_SCRIPT),
            output_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(json.dumps(payload.model_dump()).encode()),
            timeout=5 * 60,
        )
        if process.returncode == 0:
            return Path(output_path).read_bytes()
        detail = (stderr or stdout).decode(errors="replace").strip().splitlines()
        raise RuntimeError(detail[-1][:500] if detail else "Yerel model üretimi başarısız.")
    finally:
        Path(output_path).unlink(missing_ok=True)


@app.post("/generate")
async def generate(payload: GenerateRequest):
    async with _generation_lock:
        last_error: Exception | None = None
        for _attempt in range(3):
            try:
                image_bytes = await generate_in_fresh_process(payload)
                return Response(content=image_bytes, media_type="image/png")
            except Exception as error:
                last_error = error
        raise HTTPException(status_code=500, detail=str(last_error)[:500])
