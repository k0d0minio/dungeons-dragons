// The browser half of DND-025. Next loads this before any application code on
// the client, so an error thrown while the root layout hydrates — the most
// likely failure in this app, since `src/app/layout.tsx` renders components
// from a `0.5.0-beta` prerelease — is already being watched for.
//
// Nothing else belongs in this file. It runs on every page load for everyone,
// including the public reference browser that has no account behind it.
import { initSentry } from '@/lib/observability/sentry'

initSentry()
