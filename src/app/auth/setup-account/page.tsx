'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PhoneInput from '@/components/ui/PhoneInput'
import { validatePhone } from '@/lib/validations'

// Misma estructura visual que update-password/page.tsx

export default function SetupAccountPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2>(1)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined)

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    color: 'var(--text)',
    fontFamily: 'var(--font-jakarta)',
  }

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--gold)'
    e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--border2)'
    e.target.style.boxShadow = 'none'
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setStep(2)
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPhoneError(undefined)

    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!ln) {
      setError('El apellido es obligatorio.')
      return
    }
    if (!phone?.trim()) {
      setError('El teléfono es obligatorio.')
      return
    }

    const phoneRes = validatePhone(phone)
    if (!phoneRes.valid) {
      setPhoneError(phoneRes.error)
      setError(phoneRes.error ?? 'Teléfono inválido.')
      return
    }

    const full_name = `${fn} ${ln}`.trim()
    const phoneValue = phoneRes.formatted ?? phone

    setLoading(true)
    const res = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: fn,
        last_name: ln,
        full_name,
        phone: phoneValue,
      }),
    })

    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      setError(json.error ?? 'No se pudo guardar el perfil.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
        style={{ background: '#0F1020', padding: '48px 64px' }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(232,165,0,0.10) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <div
            className="font-syne font-extrabold text-4xl tracking-tight"
            style={{ color: '#E8E8F0' }}
          >
            lu<span style={{ color: '#E8A500' }}>m</span>io
          </div>
          <div className="text-xs mt-1 tracking-widest uppercase" style={{ color: '#6060A0' }}>
            by Pulse
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="font-syne font-bold text-4xl leading-tight" style={{ color: '#E8E8F0' }}>
            Tu negocio,<br />
            <span style={{ color: '#E8A500' }}>sin puntos ciegos.</span>
          </h1>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: '#A0A0C0' }}>
            Conecta tus ventas, campañas publicitarias y finanzas
            en un solo lugar. La IA analiza tu operación y te dice
            exactamente qué hacer cada semana.
          </p>
          <div className="flex gap-8 pt-2">
            <div>
              <div className="font-syne font-bold text-2xl" style={{ color: '#F5C842' }}>$9.8</div>
              <div className="text-xs" style={{ color: '#6060A0' }}>ROAS promedio</div>
            </div>
            <div>
              <div className="font-syne font-bold text-2xl" style={{ color: '#F5C842' }}>5 min</div>
              <div className="text-xs" style={{ color: '#6060A0' }}>hasta tu primer insight</div>
            </div>
            <div>
              <div className="font-syne font-bold text-2xl" style={{ color: '#F5C842' }}>100%</div>
              <div className="text-xs" style={{ color: '#6060A0' }}>en la nube</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs" style={{ color: '#4A4D6A' }}>
          © 2026 Pulse · lumio.app · Todos los derechos reservados
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
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
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--muted)' }}
          >
            {step === 1 ? 'Paso 1 de 2' : 'Paso 2 de 2'}
          </p>

          {step === 1 ? (
            <div className="space-y-8">
              <div>
                <h2 className="font-syne font-bold text-2xl" style={{ color: 'var(--text)' }}>
                  Nueva contraseña
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Crea una contraseña segura para tu cuenta.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text2)' }}
                  >
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm transition-all outline-none"
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
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

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirm"
                    className="block text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text2)' }}
                  >
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm transition-all outline-none"
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-lg leading-none"
                      style={{
                        color: 'var(--muted)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {showConfirmPassword ? '👁‍🗨' : '👁'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    className="px-3.5 py-2.5 rounded-lg text-sm"
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      border: '1px solid rgba(220,38,38,0.2)',
                      color: 'var(--red)',
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
                    background: loading
                      ? 'rgba(232,165,0,0.5)'
                      : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color: '#1A1B2E',
                    fontFamily: 'var(--font-syne)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 2px 12px rgba(232,165,0,0.25)',
                  }}
                >
                  {loading ? 'Guardando…' : 'Continuar →'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h2 className="font-syne font-bold text-2xl" style={{ color: 'var(--text)' }}>
                  Bienvenido a Lumio — Completa tu perfil
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Necesitamos unos datos para tu cuenta.
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="first_name"
                    className="block text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text2)' }}
                  >
                    Nombre
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all outline-none"
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="last_name"
                    className="block text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text2)' }}
                  >
                    Apellido
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all outline-none"
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="block text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text2)' }}
                  >
                    Teléfono
                  </label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={setPhone}
                    required
                    error={phoneError}
                  />
                </div>

                {error && (
                  <div
                    className="px-3.5 py-2.5 rounded-lg text-sm"
                    style={{
                      background: 'rgba(220,38,38,0.06)',
                      border: '1px solid rgba(220,38,38,0.2)',
                      color: 'var(--red)',
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
                    background: loading
                      ? 'rgba(232,165,0,0.5)'
                      : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color: '#1A1B2E',
                    fontFamily: 'var(--font-syne)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 2px 12px rgba(232,165,0,0.25)',
                  }}
                >
                  {loading ? 'Guardando…' : 'Ir al panel →'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
