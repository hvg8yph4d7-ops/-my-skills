// Забирает озвучку серии из ../tts/out/<id>/ в public/stuk/<id>/
// и записывает длительности фраз в src/stuk/timing/<id>.json.
// Запуск: node tools/stuk-voice.mjs s1e01
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

const id = process.argv[2];
const src = `../tts/out/${id}`;
const dst = `public/stuk/${id}`;
mkdirSync(dst, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith(".mp3")).sort();
const durations = files.map((f) => {
  copyFileSync(`${src}/${f}`, `${dst}/${f}`);
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${dst}/${f}`]);
  return Math.round(parseFloat(out.toString()) * 1000) / 1000;
});
writeFileSync(`src/stuk/timing/${id}.json`, JSON.stringify(durations) + "\n");
console.log(id, files.length, "фраз,", durations.reduce((a, b) => a + b, 0).toFixed(1), "с голоса");
