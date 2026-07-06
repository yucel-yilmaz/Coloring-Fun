#!/usr/bin/env bash
set -euo pipefail

LOCAL_AI_HOME="${LOCAL_AI_HOME:-$HOME/.cache/coloring-fun-ai}"
export HF_HOME="$LOCAL_AI_HOME/huggingface"
export HF_HUB_CACHE="$LOCAL_AI_HOME/huggingface/hub"
export PYTORCH_ENABLE_MPS_FALLBACK=1
export TOKENIZERS_PARALLELISM=false

exec "$LOCAL_AI_HOME/.venv/bin/uvicorn" app:app \
  --app-dir "$(dirname "$0")" \
  --host 127.0.0.1 \
  --port 7861
