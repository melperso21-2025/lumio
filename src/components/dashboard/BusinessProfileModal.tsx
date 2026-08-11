'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BusinessProfileModalProps {
  companyName: string
}

export default function BusinessProfileModal({ companyName }: BusinessProfileModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    try {
      if (localStorage.getItem('lumio-bizprofile-modal') !== today) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem('lumio-bizprofile-modal', new Date().toISOString().slice(0, 10))
    } catch { /* noop */ }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') dismiss() }
    if (visible) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (!visible) return null

  return (
    <>
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 210,
          background: 'rgba(10,10,20,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 211,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', pointerEvents: 'none',
      }}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: 'auto', width: '100%', maxWidth: 480,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            overflow: 'hidden', animation: 'lumio-modal-in 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              style={{
                position: 'absolute', top: 14, right: 14,
                width: 28, height: 28, borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--hover)',
                color: 'var(--muted)', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-syne)',
              }}
            >
              ✕
            </button>
            <div style={{
              padding: '24px 24px 20px',
              background: 'linear-gradient(135deg, rgba(232,165,0,0.08), rgba(245,200,66,0.04))',
              borderBottom: '1px solid var(--gold-bdr)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>✦</div>
              <h2 className="font-syne font-bold" style={{ fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>
                Completa el perfil de {companyName}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
                La IA aún no sabe a qué se dedica tu negocio. Con esta información,
                sus análisis serán específicos y accionables — no genéricos.
              </p>
            </div>
          </div>

          {/* Campos pendientes */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                {
                  icon: '📝',
                  label: 'Descripción del negocio',
                  desc: 'Qué vendes, a quién y cómo operas',
                },
                {
                  icon: '👥',
                  label: 'Tipo de cliente principal',
                  desc: 'B2B, B2C, consumidor final, empresa, etc.',
                },
                {
                  icon: '📊',
                  label: 'Rango de ingresos mensuales',
                  desc: 'Referencia para calibrar los benchmarks de la IA',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.desc}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 14, color: 'rgba(220,38,38,0.7)', flexShrink: 0 }}>●</span>
                </div>
              ))}
            </div>

            <Link
              href="/settings/business"
              onClick={dismiss}
              style={{
                display: 'block', textAlign: 'center',
                padding: '11px 0', borderRadius: 10, marginBottom: 8,
                background: 'linear-gradient(135deg,#F5C842,#F09A1A)',
                color: '#1A1B2E', textDecoration: 'none',
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
              }}
            >
              Completar perfil ahora →
            </Link>

            <button
              type="button"
              onClick={dismiss}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 10,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--muted)', cursor: 'pointer', fontSize: 12,
                fontFamily: 'var(--font-jakarta)',
              }}
            >
              Recordar mañana
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lumio-modal-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
