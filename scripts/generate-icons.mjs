// Generates the PWA icon set (DND-048) from the photo at public/eneko.jpeg.
//
// One-off tool, committed for regenerability: `npm install --no-save sharp`
// first (sharp is deliberately not a dependency — it is native, heavy, and
// only this script wants it), then `node scripts/generate-icons.mjs`.
//
// The source photo is portrait, so each output is a square crop chosen by
// sharp's `attention` strategy (it centres on the most salient region — the
// face). The photo fills the square edge to edge, so one set serves both
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
