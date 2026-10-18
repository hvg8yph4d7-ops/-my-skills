# Образцы «живых» голосов для страшных роликов. Запускается в GitHub Actions
# (там открыт интернет), результат коммитится в tts/out/.
import asyncio, os, subprocess, sys, traceback

TEXT = open("tts/text.txt", encoding="utf-8").read().strip()
OUT = "tts/out"
os.makedirs(OUT, exist_ok=True)


def edge():
    import edge_tts
    voices = [
        ("dmitry-a", "ru-RU-DmitryNeural", "-4%", "-12Hz"),
        ("dmitry-b", "ru-RU-DmitryNeural", "+4%", "-12Hz"),
    ]

    async def run():
        for name, v, rate, pitch in voices:
            try:
                await edge_tts.Communicate(TEXT, v, rate=rate, pitch=pitch).save(f"{OUT}/{name}.mp3")
                print("ok", name)
            except Exception:
                traceback.print_exc()

    asyncio.run(run())


def silero():
    import torch, soundfile as sf
    torch.hub.download_url_to_file("https://models.silero.ai/models/tts/ru/v4_ru.pt", "v4_ru.pt")
    model = torch.package.PackageImporter("v4_ru.pt").load_pickle("tts_models", "model")
    for spk in ["aidar", "eugene"]:
        audio = model.apply_tts(text=TEXT, speaker=spk, sample_rate=48000, put_accent=True, put_yo=True)
        sf.write(f"{OUT}/silero-{spk}.wav", audio.numpy(), 48000)
        print("ok silero", spk)


def xtts():
    os.environ["COQUI_TOS_AGREED"] = "1"
    from TTS.api import TTS
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    for spk in ["Damien Black", "Viktor Menelaos", "Craig Gutsy"]:
        name = spk.split()[0].lower()
        tts.tts_to_file(text=TEXT, speaker=spk, language="ru", file_path=f"{OUT}/xtts-{name}.wav")
        print("ok xtts", spk)


for step in sys.argv[1:]:
    try:
        {"edge": edge, "silero": silero, "xtts": xtts}[step]()
    except Exception:
        traceback.print_exc()

# всё в mp3, чтобы легко слушать с телефона
for f in os.listdir(OUT):
    if f.endswith(".wav"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{OUT}/{f}", "-b:a", "128k", f"{OUT}/{f[:-4]}.mp3"])
        os.remove(f"{OUT}/{f}")
