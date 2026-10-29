// Локальная замена ElevenLabs Scribe (добавлено для WOODNEXT): Whisper через transformers.js.
// Вход: wav 16 кГц моно. Выход: JSON в формате Scribe — { language_code, text, words: [{text,start,end,type,speaker_id}] },
// где между словами вставлены элементы type:"spacing", как у Scribe.
// Запуск: node asr_local.mjs <audio.wav> <out.json> [language]
// Модель и библиотека ставятся скриптом setup_local_asr.sh в ~/.cache/video-use-asr
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const CACHE = process.env.VIDEO_USE_ASR_HOME || path.join(process.env.HOME, '.cache', 'video-use-asr');
const require = createRequire(path.join(CACHE, 'run', 'package.json'));
const { pipeline, env } = await import(require.resolve('@huggingface/transformers'));

const [wav, out, lang = 'russian'] = process.argv.slice(2);
env.allowRemoteModels = false;
env.localModelPath = path.join(CACHE, 'model', 'package', 'models');

// wav (16-bit PCM) → Float32
const buf = fs.readFileSync(wav);
let off = 12, dataOff = 0, dataLen = 0, bits = 16, ch = 1;
while (off < buf.length) {
  const id = buf.toString('ascii', off, off + 4), size = buf.readUInt32LE(off + 4);
  if (id === 'fmt ') { ch = buf.readUInt16LE(off + 10); bits = buf.readUInt16LE(off + 22); }
  if (id === 'data') { dataOff = off + 8; dataLen = size; break; }
  off += 8 + size;
}
if (bits !== 16) throw new Error('expected 16-bit wav');
const n = Math.floor(dataLen / 2 / ch);
const audio = new Float32Array(n);
for (let i = 0; i < n; i++) audio[i] = buf.readInt16LE(dataOff + i * 2 * ch) / 32768;

const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', { dtype: 'q8' });
const r = await asr(audio, { language: lang, task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 });

const words = [];
let prevEnd = null;
for (const c of r.chunks || []) {
  const text = c.text.trim();
  if (!text) continue;
  const [s, e0] = c.timestamp;
  const e = e0 ?? s + 0.3;
  if (prevEnd !== null) words.push({ text: ' ', start: prevEnd, end: s, type: 'spacing', speaker_id: 'speaker_0' });
  words.push({ text, start: s, end: e, type: 'word', speaker_id: 'speaker_0' });
  prevEnd = e;
}
const codes = { russian: 'rus', english: 'eng' };
fs.writeFileSync(out, JSON.stringify({ language_code: codes[lang] || lang, language_probability: 1, text: r.text.trim(), words, engine: 'local-whisper-small' }, null, 2));
console.log(`local whisper: ${words.filter((w) => w.type === 'word').length} words`);
