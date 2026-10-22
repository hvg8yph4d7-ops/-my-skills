// Вырезает человека из видео: на выходе — сырые маски 1024x1024 (gray8), по кадру подряд
import ort from 'onnxruntime-node';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [model, input, f0, f1, outRaw] = process.argv.slice(2);
const S = 1024;
const sess = await ort.InferenceSession.create(model, { intraOpNumThreads: 4 });
const inName = sess.inputNames[0];
const ff = spawn('ffmpeg', ['-v', 'error', '-i', input, '-vf', `select='between(n,${f0},${f1})',scale=${S}:${S}`, '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
const out = fs.createWriteStream(outRaw);
let buf = Buffer.alloc(0), n = 0; const t0 = Date.now();
const frameBytes = S * S * 3;
const queue = [];
ff.stdout.on('data', (d) => { buf = Buffer.concat([buf, d]); while (buf.length >= frameBytes) { queue.push(buf.subarray(0, frameBytes)); buf = buf.subarray(frameBytes); } });
const done = new Promise((r) => ff.on('close', r));
const f32 = new Float32Array(3 * S * S);
async function run(fr) {
  for (let i = 0, j = 0; i < S * S; i++, j += 3) {
    f32[i] = (fr[j] - 128) / 256; f32[i + S * S] = (fr[j + 1] - 128) / 256; f32[i + 2 * S * S] = (fr[j + 2] - 128) / 256;
  }
  const res = await sess.run({ [inName]: new ort.Tensor('float32', f32, [1, 3, S, S]) });
  const m = res[sess.outputNames[0]].data;
  const g = Buffer.alloc(S * S);
  for (let i = 0; i < S * S; i++) g[i] = Math.max(0, Math.min(255, Math.round(m[i] * 255)));
  out.write(g); n++;
  if (n % 20 === 0) console.log(n, 'frames', ((Date.now() - t0) / n).toFixed(0), 'ms/frame');
}
let closed = false; done.then(() => (closed = true));
while (!closed || queue.length) { if (queue.length) await run(queue.shift()); else await new Promise((r) => setTimeout(r, 20)); }
out.end(); console.log('done', n);
