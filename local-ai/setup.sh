#!/usr/bin/env bash
set -euo pipefail

LOCAL_AI_HOME="${LOCAL_AI_HOME:-/Volumes/YEDEK/Coloring-Fun-AI}"
export UV_CACHE_DIR="$LOCAL_AI_HOME/uv-cache"
export UV_PYTHON_INSTALL_DIR="$LOCAL_AI_HOME/python"
mkdir -p "$LOCAL_AI_HOME" "$LOCAL_AI_HOME/huggingface"

uv venv --python 3.12 "$LOCAL_AI_HOME/.venv"
uv pip install --python "$LOCAL_AI_HOME/.venv/bin/python" -r "$(dirname "$0")/pyproject.toml"

echo "Yerel AI ortamı hazır: $LOCAL_AI_HOME"
