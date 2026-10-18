# Озвучка серий: для каждого задания tts/jobs/<id>.json делает по mp3 на фразу
# в tts/out/<id>/NN.mp3 (уже готовые фразы пропускает). Запускается в GitHub Actions.
import asyncio, glob, json, os, sys

import edge_tts


async def say(text, voice, rate, pitch, path):
    for _ in range(5):  # сервис иногда отдаёт пустой файл — повторяем
        try:
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(path)
            if os.path.getsize(path) > 1000:
                return
        except Exception as e:
            print("retry", path, e)
        await asyncio.sleep(3)
    sys.exit(f"не удалось озвучить {path}")


async def main():
    for job in sorted(glob.glob("tts/jobs/*.json")):
        jid = os.path.splitext(os.path.basename(job))[0]
        cfg = json.load(open(job, encoding="utf-8"))
        out = f"tts/out/{jid}"
        os.makedirs(out, exist_ok=True)
        for i, text in enumerate(cfg["phrases"], 1):
            path = f"{out}/{i:02d}.mp3"
            if os.path.exists(path) and os.path.getsize(path) > 1000:
                continue
            await say(text, cfg["voice"], cfg.get("rate", "+0%"), cfg.get("pitch", "+0Hz"), path)
            print("ok", path)


asyncio.run(main())
