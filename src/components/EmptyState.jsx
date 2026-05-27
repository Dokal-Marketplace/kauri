/* ── Shared style constants ──────────────────────────────────────── */
const T = {
    eyebrow: {
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      color: 'var(--tofee-orange)',
      fontWeight: 700,
      marginBottom: 10,
    },
    titleHero: {
      fontFamily: 'var(--font-serif)',
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
      marginBottom: 8,
      maxWidth: 360,
    },
    titleMd: {
      fontFamily: 'var(--font-serif)',
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      marginBottom: 5,
    },
    descHero: {
      fontSize: 13.5,
      color: 'var(--tofee-muted)',
      lineHeight: 1.55,
      maxWidth: 380,
      marginBottom: 22,
    },
    descMd: {
      fontSize: 12.5,
      color: 'var(--tofee-muted)',
      lineHeight: 1.5,
      maxWidth: 300,
      marginBottom: 16,
    },
  }
  
  export function EmptyState(props) {
    if (props.variant === 'compact') {
      const { icon, iconStyle, illustration, title, description, actions, suggestedActions, filterTweaks } = props
      return (
        <div style={{
          flex: 1, padding: '36px 24px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        }}>
          {illustration ? (
            <div style={{ width: 96, height: 96, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {illustration}
            </div>
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--tofee-cream)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tofee-orange)',
              marginBottom: 14,
              ...iconStyle,
            }}>
              <div style={{ display: 'flex' }}>{icon}</div>
            </div>
          )}
          <div style={T.titleMd}>{title}</div>
          {description && <div style={T.descMd}>{description}</div>}
          {actions}
          {suggestedActions && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
              {suggestedActions}
            </div>
          )}
          {filterTweaks && filterTweaks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18, width: '100%', maxWidth: 320 }}>
              {filterTweaks.map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: 'var(--tofee-card)',
                  border: '1px solid var(--tofee-border)',
                  borderRadius: 10, cursor: 'pointer', fontSize: 12.5, textAlign: 'left',
                }}>
                  <span style={{ color: 'var(--tofee-muted)', flexShrink: 0, display: 'flex' }}>{t.icon}</span>
                  <span style={{ flex: 1, color: 'var(--tofee-ink)', fontWeight: 500 }}>{t.label}</span>
                  {t.kbd && (
                    <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 5px', background: 'var(--tofee-cream)', borderRadius: 4, color: 'var(--tofee-muted)', fontWeight: 600 }}>{t.kbd}</kbd>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
  
    if (props.variant === 'celebration') {
      const { emoji, celebrationStyle, eyebrow, eyebrowColor, title, description, actions, tips } = props
      return (
        <div style={{
          flex: 1, padding: '40px 28px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--tofee-success-bg), rgba(200,155,60,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 18, position: 'relative',
            ...celebrationStyle,
          }}>
            <style>{`@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              border: '2px dashed rgba(91, 138, 58, 0.25)',
              animation: 'spin-slow 30s linear infinite',
            }} />
            <span style={{ fontSize: 38, zIndex: 1 }}>{emoji}</span>
          </div>
          {eyebrow && (
            <div style={{ ...T.eyebrow, color: eyebrowColor ?? 'var(--tofee-success)' }}>{eyebrow}</div>
          )}
          <div style={T.titleHero}>{title}</div>
          {description && <div style={T.descHero}>{description}</div>}
          {actions}
          {tips && tips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginTop: 22, width: '100%', maxWidth: 360 }}>
              {tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--tofee-cream)', borderRadius: 11, fontSize: 12, lineHeight: 1.5 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--tofee-orange)', color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ color: 'var(--tofee-ink)' }}>{tip.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
  
    /* hero (default) */
    const { illustration, eyebrow, eyebrowColor, title, description, actions, suggestedActions, tips } = props
    return (
      <div style={{
        flex: 1, padding: '40px 28px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        position: 'relative',
      }}>
        {illustration && (
          <div style={{ width: 140, height: 140, marginBottom: 22, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, var(--tofee-orange-glow) 0%, transparent 70%)', borderRadius: '50%' }} />
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {illustration}
            </div>
          </div>
        )}
        {eyebrow && (
          <div style={{ ...T.eyebrow, color: eyebrowColor ?? 'var(--tofee-orange)' }}>{eyebrow}</div>
        )}
        <div style={T.titleHero}>{title}</div>
        {description && <div style={T.descHero}>{description}</div>}
        {actions}
        {suggestedActions && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
            {suggestedActions}
          </div>
        )}
        {tips && tips.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginTop: 22, width: '100%', maxWidth: 360 }}>
            {tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--tofee-cream)', borderRadius: 11, fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--tofee-orange)', color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ color: 'var(--tofee-ink)' }}>{tip.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  /* ── Suggest chip ─────────────────────────────────────────────────── */
  export function SuggestChip({ children, onClick }) {
    return (
      <button onClick={onClick} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px',
        background: 'var(--tofee-card)',
        border: '1px solid var(--tofee-border)',
        borderRadius: 20,
        fontSize: 11.5, color: 'var(--tofee-ink-soft)',
        cursor: 'pointer', fontWeight: 600,
        fontFamily: 'var(--font-sans)',
      }}>
        {children}
      </button>
    )
  }
  
  /* ── Inline empty (dashed row) ────────────────────────────────────── */
  export function EmptyInline({ message, action }) {
    return (
      <div style={{
        padding: '28px 20px', textAlign: 'center',
        border: '1.5px dashed var(--tofee-border)',
        borderRadius: 14, background: 'var(--tofee-bg)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--tofee-muted)', lineHeight: 1.5, marginBottom: action ? 12 : 0 }}>
          {message}
        </div>
        {action}
      </div>
    )
  }
  