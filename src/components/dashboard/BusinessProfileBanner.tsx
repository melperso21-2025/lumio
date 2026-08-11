'use client'

import Link from 'next/link'

interface Props {
  companyName: string
}

export default function BusinessProfileBanner({ companyName }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '14px 18px', borderRadius: 12,
      background: 'rgba(245,200,66,0.07)',
      border: '1px solid rgba(245,200,66,0.3)',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>✦</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            Mejora tus análisis de IA — Completa el perfil de {companyName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            La IA aún no sabe a qué se dedica tu negocio. Con esa información podrá darte consejos específicos en vez de genéricos.
          </div>
        </div>
      </div>
      <Link
        href="/settings/business"
        style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
          background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E', textDecoration: 'none',
          fontFamily: 'var(--font-syne)',
          whiteSpace: 'nowrap',
        }}
      >
        Completar ahora →
      </Link>
    </div>
  )
}
