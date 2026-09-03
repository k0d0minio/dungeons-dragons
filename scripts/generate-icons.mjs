// Generates the PWA icon set (DND-048) from the photo at SOURCE below.
//
// The source photo is deliberately *not* committed: anything under public/ is
// served to the whole internet, and the original was a personal picture. Drop
// your own at that path before running this — the three generated PNGs are what
// the repo keeps.
//
// One-off tool, committed for regenerability: `npm install --no-save sharp`
// first (sharp is deliberately not a dependency — it is native, heavy, and
// only this script wants it), then `node scripts/generate-icons.mjs`.
//
// A portrait source is fine: each output is a square crop chosen by sharp's
// `attention` strategy (it centres on the most salient region — a face, in the
// original). The photo fills the square edge to edge, so one set serves both
// `any` and `maskable` purposes.
import { writeFile } from 'node:fs/promises'

import sharp from 'sharp'

const SOURCE = 'public/eneko.jpeg'

const outputs = [
  ['public/icon-512.png', 512],
  ['public/icon-192.png', 192],
  ['public/apple-touch-icon.png', 180],
]

for (const [path, size] of outputs) {
  const png = await sharp(SOURCE)
    .resize(size, size, { fit: 'cover', position: sharp.strategy.attention })
    .png()
    .toBuffer()
  await writeFile(path, png)
  console.log(`${path} (${size}x${size}, ${png.length} bytes)`)
}
