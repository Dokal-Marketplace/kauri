export default function AppCrashFallback({ eventId }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <p>L&apos;application a rencontré une erreur inattendue.</p>
      {eventId && <p style={{ fontSize: '0.75rem', color: '#888' }}>Référence&nbsp;: {eventId}</p>}
      <button onClick={() => window.location.reload()}>Recharger</button>
    </div>
  )
}
