// Забирает озвучку серии из ../tts/out/<id>/ в public/stuk/<id>/ (ускоряя на "tempo"
// из ../tts/jobs/<id>.json, без изменения высоты голоса) и записывает длительности фраз
// в src/stuk/timing/<id>.json.
// Запуск: node tools/stuk-voice.mjs s1e01
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const id = process.argv[2];
const src = `../tts/out/${id}`;
const dst = `public/stuk/${id}`;
// срезаем тишину по краям фразы и сокращаем паузы внутри до 0,1 с
const TRIM =
  "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.15:stop_threshold=-45dB:stop_silence=0.1";
const tempo = JSON.parse(readFileSync(`../tts/jobs/${id}.json`, "utf8")).tempo ?? 1;
mkdirSync(dst, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith(".mp3")).sort();
const durations = files.map((f) => {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${src}/${f}`, "-af", `${TRIM},atempo=${tempo}`, "-b:a", "128k", `${dst}/${f}`]);
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${dst}/${f}`]);
  return Math.round(parseFloat(out.toString()) * 1000) / 1000;
});
writeFileSync(`src/stuk/timing/${id}.json`, JSON.stringify(durations) + "\n");
console.log(id, files.length, "фраз,", durations.reduce((a, b) => a + b, 0).toFixed(1), "с голоса");
