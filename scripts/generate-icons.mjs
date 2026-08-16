// Generates the PWA icon set (DND-048) from the inline SVG below.
//
// One-off tool, committed for regenerability: `npm install --no-save sharp`
// first (sharp is deliberately not a dependency — it is native, heavy, and
// only this script wants it), then `node scripts/generate-icons.mjs`.
//
// The mark is a flat d20 — hexagonal silhouette with its front face — in the
// app's neutral palette, drawn full-bleed on the dark background so one set
// serves both `any` and `maskable` purposes (the die sits inside the maskable
// safe zone).
import { writeFile } from 'node:fs/promises'

import sharp from 'sharp'

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#18181b"/>
  <!-- d20: pointy-top hexagon, radius 150 about (256,262) -->
  <g stroke="#fafafa" stroke-width="14" stroke-linejoin="round">
    <polygon points="256,112 386,187 386,337 256,412 126,337 126,187" fill="#27272a"/>
    <polygon points="126,187 386,187 256,412" fill="#3f3f46"/>
  </g>
</svg>`

const source = Buffer.from(SVG)

const outputs = [
  ['public/icon-512.png', 512],
  ['public/icon-192.png', 192],
  ['public/apple-touch-icon.png', 180],
]

for (const [path, size] of outputs) {
  const png = await sharp(source).resize(size, size).png().toBuffer()
  await writeFile(path, png)
  console.log(`${path} (${size}x${size}, ${png.length} bytes)`)
}
