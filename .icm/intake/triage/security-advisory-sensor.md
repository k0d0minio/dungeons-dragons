# Stub: Security advisory sensor for the pinned dependencies

- lane: chore
- found-by: tech lens, 2026-08-29
- priority: P1
- size: S

Register decision D26 pins `@neondatabase/auth` at exactly `0.5.0-beta` with
"upgrade on a security advisory" as a trigger — but nothing watches for one: no
`dependabot.yml`, no audit step in CI. The package holds the app's entire auth
boundary, and `next` is exact-pinned too (middleware-bypass CVEs are a recurring
class), just as everything moves behind that boundary (D34). Security-only alerts
keep the noise near zero.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/security-advisory-sensor.md`. Add `.github/dependabot.yml`
configured for **security advisories only** (no version-bump PRs) on npm, so an
advisory against `@neondatabase/auth`, `next`, or any dependency surfaces as an
alert. Do not change any dependency versions — D26's pin stands until its trigger
fires. PR on a `claude/` branch; CI green only.
