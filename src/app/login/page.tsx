'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ── Tipos ──────────────────────────────────────────────────
type View = 'login' | 'recovery' | 'recovery-sent' | 'select-company'

interface CompanyOption {
  company_id: string
  name: string
  role: string
}

// ── Componente principal ───────────────────────────────────
export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [view,      setView]      = useState<View>('login')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [switchingCompany, setSwitchingCompany] = useState<string | null>(null)

  // Leer mensajes de error provenientes del middleware via ?error=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam === 'session_expired') {
      setError('Tu sesión expiró. Inicia sesión de nuevo.')
    } else if (errorParam === 'session_replaced') {
      setError(
        'Tu sesión fue iniciada en otro dispositivo. Por seguridad, fuiste desconectado.'
      )
    }
  }, [])

  // ── Login con email + contraseña ──────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = (await res.json()) as { message?: string }
      setError(data.message ?? 'Error al iniciar sesión')
      setLoading(false)
      return
    }

    // Verificar si el usuario pertenece a más de una empresa
    const companiesRes = await fetch('/api/companies/my-companies')
    if (companiesRes.ok) {
      const { companies: userCompanies } = (await companiesRes.json()) as {
        companies: CompanyOption[]
      }
      if (userCompanies.length > 1) {
        setCompanies(userCompanies)
        setLoading(false)
        setView('select-company')
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleSelectCompany(companyId: string) {
    setSwitchingCompany(companyId)
    await fetch('/api/companies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    })
    router.push('/dashboard')
    router.refresh()
  }

  // ── Recuperación de contraseña ────────────────────────────
  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })

    if (error) {
      setError('No pudimos enviar el email. Verifica la dirección.')
      setLoading(false)
      return
    }

    setView('recovery-sent')
    setLoading(false)
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Panel izquierdo — Identidad de marca ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
        style={{
            background: '#0F1020',
            padding: '48px 64px',        // py-12 = 48px, px-16 = 64px
        }}
      >
        {/* Grid de fondo */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow dorado */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(232,165,0,0.10) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div
            className="font-syne font-extrabold text-4xl tracking-tight"
            style={{ color: '#E8E8F0' }}
          >
            lu<span style={{ color: '#E8A500' }}>m</span>io
          </div>
          <div
            className="text-xs mt-1 tracking-widest uppercase"
            style={{ color: '#6060A0' }}
          >
            by Pulse
          </div>
        </div>

        {/* Tagline central */}
        <div className="relative z-10 space-y-6">
          <h1
            className="font-syne font-bold text-4xl leading-tight"
            style={{ color: '#E8E8F0' }}
          >
            Tu negocio,<br />
            <span style={{ color: '#E8A500' }}>sin puntos ciegos.</span>
          </h1>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: '#A0A0C0' }}>
            Conecta tus ventas, campañas publicitarias y finanzas
            en un solo lugar. La IA analiza tu operación y te dice
            exactamente qué hacer cada semana.
          </p>

          {/* Stats de credibilidad */}
          <div className="flex gap-8 pt-2">
            <div>
              <div className="font-syne font-bold text-2xl" style={{ color: '#F5C842' }}>
                $9.8
              </div>
              <div className="text-xs" style={{ color: '#6060A0' }}>ROAS promedio</div>
            </div>
            <div>
              <div className="font-syne font-bold text-2xl" style={{ color: '#F5C842' }}>
                5 min
              </div>
              <div className="text-xs" style={{ color: '#6060A0' }}>hasta tu primer insight</div>
            </div>
            <div>
              <div className="font-syne font-bold text-2xl" style={{ color: '#F5C842' }}>
                100%
              </div>
              <div className="text-xs" style={{ color: '#6060A0' }}>en la nube</div>
            </div>
          </div>
        </div>

        {/* Footer del panel */}
        <div className="relative z-10 text-xs" style={{ color: '#4A4D6A' }}>
          © 2026 Pulse · lumio.app · Todos los derechos reservados
        </div>
      </div>

      {/* ── Panel derecho — Formulario ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">

        {/* Logo mobile */}
        <div className="lg:hidden mb-10 text-center">
          <div
            className="font-syne font-extrabold text-3xl tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            lu<span style={{ color: 'var(--gold)' }}>m</span>io
          </div>
          <div className="text-xs mt-1 tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            by Pulse
          </div>
        </div>

        <div className="w-full max-w-sm">

          {/* ── Vista: LOGIN ── */}
          {view === 'login' && (
            <div className="space-y-8">
              <div>
                <h2
                  className="font-syne font-bold text-2xl"
                  style={{ color: 'var(--text)' }}
                >
                  Bienvenido
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Ingresa con tu cuenta de Lumio
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">

                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text2)' }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all outline-none"
                    style={{
                      background:   'var(--surface)',
                      border:       '1px solid var(--border2)',
                      color:        'var(--text)',
                      fontFamily:   'var(--font-jakarta)',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--gold)'
                      e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--border2)'
                      e.target.style.boxShadow   = 'none'
                    }}
                  />
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text2)' }}
                    >
                      Contraseña
                    </label>
                    <button
                      type="button"
                      onClick={() => { setView('recovery'); setError(null) }}
                      className="text-xs transition-colors"
                      style={{ color: 'var(--gold)' }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm transition-all outline-none"
                      style={{
                        background: 'var(--surface)',
                        border:     '1px solid var(--border2)',
                        color:      'var(--text)',
                        fontFamily: 'var(--font-jakarta)',
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = 'var(--gold)'
                        e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'var(--border2)'
                        e.target.style.boxShadow   = 'none'
                      }}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-lg leading-none"
                      style={{
                        color: 'var(--muted)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? '👁‍🗨' : '👁'}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="px-3.5 py-2.5 rounded-lg text-sm"
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      border:     '1px solid rgba(220,38,38,0.2)',
                      color:      'var(--red)',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Botón */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background:  loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color:       '#1A1B2E',
                    fontFamily:  'var(--font-syne)',
                    cursor:      loading ? 'not-allowed' : 'pointer',
                    boxShadow:   loading ? 'none' : '0 2px 12px rgba(232,165,0,0.25)',
                  }}
                >
                  {loading ? 'Ingresando...' : 'Ingresar a lumio →'}
                </button>

              </form>

              <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                ¿No tienes cuenta? Contacta a tu administrador de Pulse.
              </p>
            </div>
          )}

          {/* ── Vista: RECUPERACIÓN ── */}
          {view === 'recovery' && (
            <div className="space-y-8">
              <div>
                <button
                  onClick={() => { setView('login'); setError(null) }}
                  className="flex items-center gap-1.5 text-xs mb-4 transition-colors"
                  style={{ color: 'var(--muted)' }}
                >
                  ← Volver al login
                </button>
                <h2
                  className="font-syne font-bold text-2xl"
                  style={{ color: 'var(--text)' }}
                >
                  Recuperar acceso
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Te enviamos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <form onSubmit={handleRecovery} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="recovery-email"
                    className="block text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text2)' }}
                  >
                    Tu email
                  </label>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all outline-none"
                    style={{
                      background: 'var(--surface)',
                      border:     '1px solid var(--border2)',
                      color:      'var(--text)',
                      fontFamily: 'var(--font-jakarta)',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--gold)'
                      e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--border2)'
                      e.target.style.boxShadow   = 'none'
                    }}
                  />
                </div>

                {error && (
                  <div
                    className="px-3.5 py-2.5 rounded-lg text-sm"
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      border:     '1px solid rgba(220,38,38,0.2)',
                      color:      'var(--red)',
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background:  loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color:       '#1A1B2E',
                    fontFamily:  'var(--font-syne)',
                    cursor:      loading ? 'not-allowed' : 'pointer',
                    boxShadow:   loading ? 'none' : '0 2px 12px rgba(232,165,0,0.25)',
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </div>
          )}

          {/* ── Vista: SELECCIÓN DE EMPRESA ── */}
          {view === 'select-company' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-syne font-bold text-2xl" style={{ color: 'var(--text)' }}>
                  ¿Con qué empresa deseas entrar?
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Tu cuenta tiene acceso a múltiples empresas.
                </p>
              </div>
              <div className="space-y-2">
                {companies.map((c) => (
                  <button
                    key={c.company_id}
                    type="button"
                    onClick={() => handleSelectCompany(c.company_id)}
                    disabled={!!switchingCompany}
                    className="w-full flex items-center justify-between gap-3 rounded-lg transition-all text-left"
                    style={{
                      padding: '12px 16px',
                      border: '1px solid var(--border2)',
                      background: switchingCompany === c.company_id ? 'var(--gold-bg)' : 'var(--surface)',
                      color: 'var(--text)',
                      cursor: switchingCompany ? 'wait' : 'pointer',
                      opacity: switchingCompany && switchingCompany !== c.company_id ? 0.5 : 1,
                      fontFamily: 'var(--font-jakarta)',
                    }}
                  >
                    <div>
                      <div className="font-semibold text-sm">{c.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{c.role}</div>
                    </div>
                    <span style={{ color: 'var(--gold)', fontSize: 16 }}>
                      {switchingCompany === c.company_id ? '⏳' : '→'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Vista: EMAIL ENVIADO ── */}
          {view === 'recovery-sent' && (
            <div className="space-y-6 text-center">
              <div
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{
                  background: 'var(--gold-bg)',
                  border:     '1px solid var(--gold-bdr)',
                }}
              >
                ✉
              </div>
              <div>
                <h2
                  className="font-syne font-bold text-2xl"
                  style={{ color: 'var(--text)' }}
                >
                  Revisa tu email
                </h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Enviamos un enlace de recuperación a{' '}
                  <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                  Revisa también tu carpeta de spam.
                </p>
              </div>
              <button
                onClick={() => { setView('login'); setError(null) }}
                className="text-sm transition-colors"
                style={{ color: 'var(--gold)' }}
              >
                ← Volver al login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
