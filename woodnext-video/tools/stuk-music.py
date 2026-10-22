# Фоновая музыка «Третьего стука»: мрачный эмбиент с мелодичными нотами
# (как у surv_protocol): бас-гул, аккорды ля-минора с мягкой атакой,
# редкие «колокольчики» с эхом и тихий пульс. Пишет public/stuk/sfx/ambient.wav.
import wave

import numpy as np

SR, DUR = 44100, 100
t = np.arange(SR * DUR) / SR
out = np.zeros_like(t)


def note(freq, start, length, amp, attack=1.2, release=2.0, bright=0.25):
    i0, n = int(start * SR), int(length * SR)
    if i0 >= len(t):
        return
    n = min(n, len(t) - i0)
    tt = np.arange(n) / SR
    env = np.minimum(1, tt / attack) * np.minimum(1, (length - tt) / release).clip(0)
    w = np.sin(2 * np.pi * freq * tt) + bright * np.sin(4 * np.pi * freq * tt + 0.3) + 0.1 * np.sin(6 * np.pi * freq * tt)
    out[i0 : i0 + n] += amp * env * w


A1, A2 = 55.0, 110.0
chords = [  # ля-минор → фа → ре-минор → ми (по 4 с)
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 261.63],
    [146.83, 174.61, 220.0],
    [164.81, 207.65, 246.94],
]
for k in range(DUR // 4):
    c = chords[k % 4]
    for f in c:
        note(f, k * 4, 5.0, 0.05, attack=1.5, release=2.0)
    note(c[0] / 2, k * 4, 4.6, 0.08, attack=0.6, release=1.0, bright=0.1)

out += 0.16 * np.sin(2 * np.pi * A1 * t) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * t))

bells = [880.0, 1046.5, 987.77, 659.25, 783.99, 698.46]  # ля-минорные ноты сверху
rng = np.random.default_rng(3)
for k, s in enumerate(np.arange(2.0, DUR - 3, 3.0)):
    if rng.random() < 0.75:
        note(bells[k % len(bells)], s + rng.random() * 0.8, 2.5, 0.035, attack=0.01, release=2.4, bright=0.05)

beat = 0.85  # тихий пульс, как сердце
ph = np.mod(t, beat)
out += 0.22 * np.sin(2 * np.pi * 50 * t) * (np.exp(-26 * ph) + 0.55 * np.exp(-26 * np.mod(t - 0.2, beat)))

# простое эхо и нормализация
d = int(0.42 * SR)
wet = out.copy()
wet[d:] += 0.35 * out[:-d]
wet[2 * d :] += 0.18 * out[: -2 * d]
fade = np.minimum(1, t / 2) * np.minimum(1, (DUR - t) / 3)
wet *= fade / np.max(np.abs(wet)) * 0.85
pcm = (wet * 32767).astype(np.int16)
with wave.open("public/stuk/sfx/ambient.wav", "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
