import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

// Relative rather than `@/lib/...`: this file is loaded by Next's own config
// loader, which does not read the tsconfig path aliases.
import { contentSecurityPolicy } from './src/lib/security/csp'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            // Added by `dm-prep-suite/locations-handouts`, because that is the
            // ticket where the app first renders a file a user uploaded. What
            // each directive is for, and why `'unsafe-inline'` is still in
            // there, is written out in `src/lib/security/csp.ts`.
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({
              sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
              development: process.env.NODE_ENV === 'development',
            }),
          },
        ],
      },
    ]
  },
}

// Reporting itself does not come from here — that is `initSentry()`, called by
// `src/instrumentation.ts` and `src/instrumentation-client.ts`, and it needs
// only `NEXT_PUBLIC_SENTRY_DSN`. The build plugin's entire job is uploading
// source maps and creating a release, both of which need `SENTRY_AUTH_TOKEN`.
//
// So without a token it is not applied at all, and the build stays byte-for-byte
// the one that runs today: a fresh clone, a preview deploy without the secret and
// anyone who never sets Sentry up all get exactly what they got before DND-025.
// With a token, stack traces from the minified bundle become readable.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // A line or two in the Vercel build log, not fifty.
      silent: true,
      // Uploaded, then deleted from the deployment. A public `.js.map` next to
      // the bundle hands the app's server-side source to anyone who asks.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      // The hook this asks for instruments *navigation traces*, and tracing is
      // deliberately off (see `src/lib/observability/sentry.ts`). Nothing to
      // wire up, so nothing to be told about on every build.
      suppressOnRouterTransitionStartWarning: true,
    })
  : nextConfig
