# Фон для финансовых роликов: спокойный ритм 96 BPM — мягкая бочка, тихий хэт,
# щипковые ноты (ля-минорная пентатоника) и пэд. Пишет public/fin/beat.wav.
import wave

import numpy as np

SR, DUR, BPM = 44100, 100, 96
t = np.arange(SR * DUR) / SR
out = np.zeros_like(t)
beat = 60 / BPM


def add(sig, start):
    i0 = int(start * SR)
    if i0 >= len(out):
        return
    n = min(len(sig), len(out) - i0)
    out[i0 : i0 + n] += sig[:n]


tt = np.arange(int(0.4 * SR)) / SR
kick = 0.9 * np.sin(2 * np.pi * (55 + 90 * np.exp(-30 * tt)) * tt) * np.exp(-9 * tt)
th = np.arange(int(0.05 * SR)) / SR
hat = 0.12 * np.random.default_rng(1).standard_normal(len(th)) * np.exp(-90 * th)
tp = np.arange(int(0.6 * SR)) / SR
notes = [440.0, 523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25]

k = 0
s = 0.0
while s < DUR:
    add(kick, s)
    add(hat, s + beat / 2)
    f = notes[k % len(notes)]
    pluck = 0.12 * (np.sin(2 * np.pi * f * tp) + 0.3 * np.sin(4 * np.pi * f * tp)) * np.exp(-6 * tp)
    if k % 2 == 0:
        add(pluck, s)
    s += beat
    k += 1

pad_f = [110.0, 87.31, 98.0, 82.41]
for k in range(int(DUR / (beat * 8)) + 1):
    f = pad_f[k % 4]
    start = k * beat * 8
    n = int(beat * 8 * SR)
    p = np.arange(n) / SR
    env = np.minimum(1, p / 1.0) * np.minimum(1, (beat * 8 - p) / 1.0)
    add(0.10 * env * (np.sin(2 * np.pi * f * p) + 0.5 * np.sin(2 * np.pi * f * 1.5 * p)), start)

fade = np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 3)
out = out * fade / np.max(np.abs(out)) * 0.8
with wave.open("public/fin/beat.wav", "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
