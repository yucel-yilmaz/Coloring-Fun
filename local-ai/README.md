# Local SDXL service

This service runs SDXL Base with the SDXL-Lightning 4-step LoRA and
ColoringBookRedmond LoRA and the FP16-safe SDXL VAE on Apple Silicon through
MPS. The Python environment and model cache live under
`~/.cache/coloring-fun-ai` by default. Set `LOCAL_AI_HOME` before setup and
startup to use another location.

```bash
npm run local-ai:setup
npm run local-ai:start
```

The HTTP service binds only to `127.0.0.1:7861`.
