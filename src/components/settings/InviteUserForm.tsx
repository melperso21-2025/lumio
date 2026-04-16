'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Estilos base (igual que NewCustomerForm) ───────────────────
const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 4,
}

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

interface InviteUserFormProps {
  companyId: string
}

export default function InviteUserForm({ companyId }: InviteUserFormProps) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [full_name, setFullName] = useState('')
  const [role, setRole] = useState('operator')
  const [job_title, setJobTitle] = useState('')

  function resetForm() {
    setEmail('')
    setFullName('')
    setRole('operator')
    setJobTitle('')
    setError(null)
    setSuccess(false)
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email.trim() || !full_name.trim()) {
      setError('Email y nombre son obligatorios.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: full_name.trim(),
          role,
          job_title: job_title.trim() || null,
          company_id: companyId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Error al invitar al usuario.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      resetForm()
      router.refresh()

      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1500)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-syne font-bold text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color: '#1A1B2E',
        }}
      >
        + Invitar usuario
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Invitar usuario"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h3
                className="font-syne font-bold"
                style={{ fontSize: 16, color: 'var(--text)' }}
              >
                Invitar usuario
              </h3>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  color: 'var(--muted)',
                  fontSize: 18,
                  lineHeight: 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {success && (
              <div
                style={{
                  background: 'rgba(5,150,105,0.08)',
                  border: '1px solid rgba(5,150,105,0.2)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--green)',
                  fontWeight: 500,
                }}
              >
                ✓ Invitación enviada correctamente
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--red)',
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <label htmlFor="iu-full_name" style={labelStyle}>
                  Nombre completo
                </label>
                <input
                  id="iu-full_name"
                  type="text"
                  required
                  value={full_name}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre completo"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="iu-email" style={labelStyle}>
                  Email
                </label>
                <input
                  id="iu-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label htmlFor="iu-role" style={labelStyle}>
                  Rol
                </label>
                <select
                  id="iu-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="operator">
                    Operativo — registra ventas y operaciones
                  </option>
                  <option value="manager">
                    Gerente — ve todos los módulos sin editar config
                  </option>
                  <option value="admin">
                    Administrador — acceso completo
                  </option>
                </select>
                <div
                  style={{
                    background: 'var(--gold-bg)',
                    border: '1px solid var(--gold-bdr)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 11,
                    color: 'var(--text2)',
                    marginTop: 8,
                  }}
                >
                  📧 El usuario recibirá un email de invitación para crear su
                  contraseña.
                </div>
              </div>

              <div>
                <label htmlFor="iu-job_title" style={labelStyle}>
                  Cargo
                </label>
                <input
                  id="iu-job_title"
                  type="text"
                  value={job_title}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ej: Vendedor, Contador"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    background: 'var(--hover)',
                    color: 'var(--text2)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="font-syne font-bold"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontSize: 14,
                    background: loading
                      ? 'rgba(232,165,0,0.5)'
                      : 'linear-gradient(135deg, #F5C842, #F09A1A)',
                    color: '#1A1B2E',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
