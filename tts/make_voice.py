# Озвучка серий: для каждого задания tts/jobs/<id>.json делает по mp3 на фразу
# в tts/out/<id>/NN.mp3 (уже готовые фразы пропускает). Запускается в GitHub Actions.
import asyncio, glob, json, os, sys

import edge_tts


async def try_say(text, voice, rate, pitch, path, attempts):
    for attempt in range(attempts):  # сервис иногда отдаёт пустой ответ — повторяем с растущей паузой
        try:
            await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(path)
            if os.path.getsize(path) > 6000:
                return True
        except Exception as e:
            print("retry", path, e)
        await asyncio.sleep(5 * 2**attempt)
    return False


async def say(text, voice, rate, pitch, path):
    if await try_say(text, voice, rate, pitch, path, 4):
        return True
    # запасной вариант: без тире и «ё» — на некоторых фразах сервис спотыкается о них
    simple = text.replace(" — ", ", ").replace("—", ",").replace("ё", "е").replace("Ё", "Е")
    if simple != text and await try_say(simple, voice, rate, pitch, path, 3):
        print("ok (упрощённый текст)", path)
        return True
    if os.path.exists(path):
        os.remove(path)
    print("не удалось озвучить", path)
    return False


async def main():
    failed = []
    for job in sorted(glob.glob("tts/jobs/*.json")):
        jid = os.path.splitext(os.path.basename(job))[0]
        cfg = json.load(open(job, encoding="utf-8"))
        out = f"tts/out/{jid}"
        os.makedirs(out, exist_ok=True)
        for i, text in enumerate(cfg["phrases"], 1):
            path = f"{out}/{i:02d}.mp3"
            if os.path.exists(path) and os.path.getsize(path) > 6000:
                continue
            if await say(text, cfg["voice"], cfg.get("rate", "+0%"), cfg.get("pitch", "+0Hz"), path):
                print("ok", path)
            else:
                failed.append(path)

    if failed:
        sys.exit("не озвучены: " + ", ".join(failed))


asyncio.run(main())
