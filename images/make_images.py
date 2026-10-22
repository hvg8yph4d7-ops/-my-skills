# Генерация кадров для роликов: для каждого images/jobs/<id>.json делает images/out/<id>/NN.jpg
# через бесплатный генератор Pollinations (модель flux). Запускается в GitHub Actions.
import glob, json, os, sys, time, urllib.parse, urllib.request

failed = []
for job in sorted(glob.glob("images/jobs/*.json")):
    jid = os.path.splitext(os.path.basename(job))[0]
    cfg = json.load(open(job, encoding="utf-8"))
    out = f"images/out/{jid}"
    os.makedirs(out, exist_ok=True)
    for i, prompt in enumerate(cfg["prompts"], 1):
        path = f"{out}/{i:02d}.jpg"
        if os.path.exists(path) and os.path.getsize(path) > 20000:
            continue
        full = f"{prompt}, {cfg.get('style', '')}"
        q = urllib.parse.urlencode({"width": cfg.get("width", 768), "height": cfg.get("height", 1344), "model": "flux", "nologo": "true", "seed": cfg.get("seed", 7) + i})
        url = "https://image.pollinations.ai/prompt/" + urllib.parse.quote(full) + "?" + q
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                data = urllib.request.urlopen(req, timeout=180).read()
                if len(data) > 20000:
                    open(path, "wb").write(data)
                    print("ok", path, len(data))
                    break
                print("small", len(data))
            except Exception as e:
                print("retry", path, e)
            time.sleep(10 * (attempt + 1))
        else:
            failed.append(path)
if failed:
    sys.exit("не получилось: " + ", ".join(failed))
