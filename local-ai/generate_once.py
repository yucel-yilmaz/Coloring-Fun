import io
import json
import os
import secrets
import sys
from pathlib import Path

import torch
from diffusers import AutoencoderKL, EulerDiscreteScheduler, StableDiffusionXLPipeline

BASE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
LIGHTNING_LORA = "ByteDance/SDXL-Lightning"
COLORING_LORA = "artificialguybr/ColoringBookRedmond"
FIXED_VAE = "madebyollin/sdxl-vae-fp16-fix"
MODEL_CACHE = os.environ.get("HF_HOME", str(Path.home() / ".cache/coloring-fun-ai/huggingface"))


def main():
    payload = json.loads(sys.stdin.read())
    output_path = Path(sys.argv[1])
    if not torch.backends.mps.is_available():
        raise RuntimeError("Apple Metal (MPS) kullanılamıyor.")

    vae = AutoencoderKL.from_pretrained(
        FIXED_VAE,
        cache_dir=MODEL_CACHE,
        torch_dtype=torch.float16,
        use_safetensors=True,
    )
    pipe = StableDiffusionXLPipeline.from_pretrained(
        BASE_MODEL,
        cache_dir=MODEL_CACHE,
        vae=vae,
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
    )
    pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config, timestep_spacing="trailing")
    pipe.load_lora_weights(
        LIGHTNING_LORA,
        weight_name="sdxl_lightning_4step_lora.safetensors",
        adapter_name="lightning",
        cache_dir=MODEL_CACHE,
    )
    pipe.load_lora_weights(
        COLORING_LORA,
        weight_name="ColoringBookRedmond-ColoringBookAF.safetensors",
        adapter_name="coloring",
        cache_dir=MODEL_CACHE,
    )
    # A lower coloring-adapter weight keeps the useful black-line style without
    # letting the LoRA fill every surface with tiny decorative details.
    pipe.set_adapters(["lightning", "coloring"], adapter_weights=[1.0, 0.8])
    pipe.enable_attention_slicing()
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()
    pipe.vae.config.force_upcast = False
    pipe.to("mps")

    width, height = ((768, 1024) if payload["orientation"] == "portrait" else (1024, 768))
    prompt = (
        f"{payload['prompt']}. Show this exact subject clearly. "
        "ColoringBookAF, minimal black-and-white vector outline icon, extremely simple preschool coloring-book line art, "
        "bold smooth outer contour silhouettes, large rounded vector-like shapes, "
        "one closed contour per body part, interiors completely blank, "
        "only essential object-separation lines and minimal eyes nose and mouth, "
        "hair fur and fabric shown as a single outer silhouette without strand lines, "
        "every coloring region is a large fully enclosed white area with no gaps in its boundary, "
        "very large empty white fillable regions, pure white background, "
        "all fine interior texture and decorative micro-details omitted, "
        "clean uniform black outlines, outline-only eyes and nose, no solid black filled shapes, "
        "no broken lines, no fur strands, no hatching, no shading, no frame, no text. "
    )
    image = pipe(
        prompt=prompt,
        width=width,
        height=height,
        num_inference_steps=4,
        guidance_scale=0.0,
        generator=torch.Generator(device="cpu").manual_seed(secrets.randbelow(2**31)),
    ).images[0].convert("RGB")
    extrema = image.getextrema()
    if max(high for _low, high in extrema) - min(low for low, _high in extrema) < 10:
        raise RuntimeError("SDXL tek renk veya bozuk görsel üretti.")
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    output_path.write_bytes(output.getvalue())


if __name__ == "__main__":
    main()
