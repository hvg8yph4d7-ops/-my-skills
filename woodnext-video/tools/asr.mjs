import { pipeline, env } from '@huggingface/transformers';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
env.allowRemoteModels = false;
env.localModelPath = process.argv[2];
const files = process.argv.slice(3);
const asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', { dtype: 'q8' });
const out = {};
for (const f of files) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const audio = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  let r;
  try {
    r = await asr(audio, { language: 'russian', task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30 });
  } catch (e) {
    console.error('word ts failed:', e.message);
    r = await asr(audio, { language: 'russian', task: 'transcribe', return_timestamps: true, chunk_length_s: 30 });
  }
  out[f.split('/').pop()] = r;
  console.log('==', f.split('/').pop(), '\n', r.text);
}
fs.writeFileSync(process.argv[2] + '/../asr.json', JSON.stringify(out, null, 1));
