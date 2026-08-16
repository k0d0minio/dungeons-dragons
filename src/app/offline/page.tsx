/**
 * The offline fallback (DND-048). The service worker serves this cached page
 * when a navigation fails with no network — instead of the browser's error
 * screen, the app says plainly what is wrong.
 *
 * Deliberately self-contained: styles are inline because the page is served
 * from the service worker's cache while the build's hashed CSS files may be
 * unreachable, and a fallback that renders unstyled is half a fallback.
 */
export const metadata = {
  title: 'Offline',
}

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '60dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          You&apos;re offline
        </h1>
        <p style={{ opacity: 0.75, maxWidth: '28rem' }}>
          The companion needs a connection — sheets and lookups live on the server, not on this
          phone. Reconnect and pull this page down to retry.
        </p>
      </div>
    </main>
  )
}
