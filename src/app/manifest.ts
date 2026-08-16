import type { MetadataRoute } from 'next'

/**
 * The web app manifest (DND-048, register decision D28): the app installs to
 * a home screen and runs standalone, and that is the whole ambition — no
 * offline data, no sync. D2's retirement of *offline* stands; only
 * installability came back.
 *
 * One icon set serves `any` and `maskable`: a full-bleed square crop of the
 * table's chosen photo, with the subject inside the maskable safe zone (see
 * `scripts/generate-icons.mjs`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'D&D 5e Companion',
    short_name: 'D&D 5e',
    description:
      'The thing on the table next to the dice — reference lookup and living character sheets for one D&D table.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
