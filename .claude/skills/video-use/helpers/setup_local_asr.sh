#!/usr/bin/env bash
# Ставит бесплатное локальное распознавание речи (замена ElevenLabs Scribe) — добавлено для WOODNEXT.
# Модель Whisper small (~250 МБ) берётся из npm-пакета sts-whisper-small: huggingface.co из облачной среды закрыт.
set -e
CACHE="${VIDEO_USE_ASR_HOME:-$HOME/.cache/video-use-asr}"
mkdir -p "$CACHE/model" "$CACHE/run"
if [ ! -d "$CACHE/model/package/models/Xenova/whisper-small" ]; then
  (cd "$CACHE/model" && npm pack -q sts-whisper-small@1.0.0 && tar xzf sts-whisper-small-1.0.0.tgz && rm -f sts-whisper-small-1.0.0.tgz)
fi
if [ ! -d "$CACHE/run/node_modules/@huggingface/transformers" ]; then
  (cd "$CACHE/run" && [ -f package.json ] || npm init -y >/dev/null; cd "$CACHE/run" && npm i -q --ignore-scripts @huggingface/transformers)
fi
echo "local ASR ready: $CACHE"
