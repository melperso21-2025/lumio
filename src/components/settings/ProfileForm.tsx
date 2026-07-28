'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/context/UserContext'
import PhoneInput from '@/components/ui/PhoneInput'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string
  full_name: string
  email: string
  role: string
  job_title: string | null
  phone: string | null
  alias: string | null
  avatar_url: string | null
  notify_whatsapp: boolean | null
  notify_email: boolean | null
  company_name?: string | null
}

// ── Badge de rol ───────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  admin:   { bg: '#2D1B5E', color: '#C084FC', label: 'Admin' },
  manager: { bg: '#1A3A2A', color: '#4ADE80', label: 'Manager' },
  operator: { bg: '#1A2E44', color: '#60A5FA', label: 'Operativo' },
}
function getRoleStyle(role: string) {
  return ROLE_COLORS[role] ?? { bg: 'var(--hover)', color: 'var(--muted)', label: role }
}

// ── Helpers de Canvas ──────────────────────────────────────────────────────

const MAX_PX   = 400
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED  = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Redimensiona la imagen a máx MAX_PX×MAX_PX y la convierte a webp.
 * Devuelve un Blob webp listo para subir.
 */
async function resizeToWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1)
      const w = Math.round(img.width  * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Error al convertir imagen'))
        },
        'image/webp',
        0.88
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')) }
    img.src = url
  })
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: 'var(--text2)' }}
    >
      {children}
    </span>
  )
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all outline-none"
      style={{
        background:  disabled ? 'var(--bg)' : 'var(--surface)',
        border:      '1px solid var(--border2)',
        color:       disabled ? 'var(--muted)' : 'var(--text)',
        fontFamily:  'var(--font-jakarta)',
        cursor:      disabled ? 'default' : undefined,
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.target.style.borderColor = 'var(--gold)'
          e.target.style.boxShadow   = '0 0 0 3px var(--gold-bg)'
        }
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--border2)'
        e.target.style.boxShadow   = 'none'
      }}
    />
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: 'var(--bg)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        cursor: 'pointer',
        gap: 12,
      }}
    >
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: checked ? 'var(--gold)' : 'var(--border2)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.2s',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </label>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

// Divide full_name en primera palabra (firstName) y el resto (lastName)
function splitFullName(full: string): [string, string] {
  const trimmed = full.trim()
  const idx = trimmed.indexOf(' ')
  if (idx === -1) return [trimmed, '']
  return [trimmed.slice(0, idx), trimmed.slice(idx + 1).trim()]
}

export default function ProfileForm({ profile }: { profile: ProfileData }) {
  const { refreshUser } = useUser()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // ── Estado del formulario ────────────────────────────────────────────────
  const [initialFirst, initialLast] = splitFullName(profile.full_name ?? '')
  const [firstName,      setFirstName]      = useState(initialFirst)
  const [lastName,       setLastName]       = useState(initialLast)
  const [alias,          setAlias]          = useState(profile.alias ?? '')
  const [phone,          setPhone]          = useState(profile.phone ?? '')
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(profile.notify_whatsapp ?? false)
  const [notifyEmail,    setNotifyEmail]    = useState(profile.notify_email ?? true)

  // ── Estado del avatar ────────────────────────────────────────────────────
  const [avatarPreview,   setAvatarPreview]   = useState<string | null>(profile.avatar_url)
  const [avatarBlob,      setAvatarBlob]      = useState<Blob | null>(null)
  const [avatarLoading,   setAvatarLoading]   = useState(false)
  const [avatarError,     setAvatarError]     = useState<string | null>(null)

  // ── Estado de guardado ───────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved,     setSaved]     = useState(false)

  const initials = [firstName[0], lastName[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  const roleStyle = getRoleStyle(profile.role)

  // ── Selección de archivo ─────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError(null)

    if (!ALLOWED.includes(file.type)) {
      setAvatarError('Solo se permiten archivos JPEG, PNG o WEBP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setAvatarError('El archivo supera el límite de 2 MB.')
      return
    }

    setAvatarLoading(true)
    try {
      const blob = await resizeToWebp(file)
      const previewUrl = URL.createObjectURL(blob)
      setAvatarPreview(previewUrl)
      setAvatarBlob(blob)
    } catch {
      setAvatarError('No se pudo procesar la imagen. Intenta con otro archivo.')
    } finally {
      setAvatarLoading(false)
      e.target.value = ''
    }
  }

  // ── Subida del avatar a Storage ──────────────────────────────────────────
  async function uploadAvatar(): Promise<string | null> {
    if (!avatarBlob) return null

    const path = `${profile.id}/${profile.id}.webp`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, avatarBlob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    // Añade timestamp para invalidar caché
    return `${data.publicUrl}?t=${Date.now()}`
  }

  // ── Guardar cambios ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    try {
      let newAvatarUrl: string | null = null

      if (avatarBlob) {
        newAvatarUrl = await uploadAvatar()
      }

      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')

      const body: Record<string, unknown> = {
        full_name:       fullName,
        alias:           alias.trim() || null,
        phone:           phone || null,
        notify_whatsapp: notifyWhatsapp,
        notify_email:    notifyEmail,
      }
      if (newAvatarUrl) body.avatar_url = newAvatarUrl

      const res = await fetch('/api/users/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const json = (await res.json()) as { data?: ProfileData; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

      // Actualizar el contexto para reflejar cambios en Topbar/Sidebar
      refreshUser({
        userName:  fullName,
        avatarUrl: newAvatarUrl ?? profile.avatar_url,
      })

      setAvatarBlob(null)
      setSaved(true)
      // Mostrar banner 1 segundo y luego volver a la página anterior
      setTimeout(() => router.back(), 1000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background:   'var(--card)',
    border:       '1px solid var(--border)',
    borderRadius: 12,
    padding:      '20px 24px',
  }

  const sectionTitle = (text: string) => (
    <h3
      className="font-syne font-bold mb-4"
      style={{ fontSize: 14, color: 'var(--text)' }}
    >
      {text}
    </h3>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Sección Avatar ── */}
      <div style={cardStyle}>
        {sectionTitle('Foto de perfil')}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Preview */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              background: avatarPreview ? 'transparent' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              fontFamily: 'var(--font-syne)',
              color: '#1A1B2E',
              border: '2px solid var(--border)',
            }}
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials || '?'
            )}
          </div>

          {/* Controles */}
          <div style={{ flex: 1 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={avatarLoading}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 13,
                cursor: avatarLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-syne)',
                fontWeight: 600,
              }}
            >
              {avatarLoading ? 'Procesando…' : 'Cambiar foto'}
            </button>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              JPEG, PNG o WEBP · Máx. 2 MB · Se redimensiona a 400×400 px
            </p>
            {avatarBlob && !avatarError && (
              <p className="text-xs mt-1" style={{ color: 'var(--gold)' }}>
                ✓ Nueva imagen lista — se subirá al guardar
              </p>
            )}
            {avatarError && (
              <p className="text-xs mt-1" style={{ color: 'var(--red, #F87171)' }}>
                {avatarError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Datos personales ── */}
      <div style={cardStyle}>
        {sectionTitle('Datos personales')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Label>Nombre</Label>
            <TextInput
              id="first_name"
              value={firstName}
              onChange={setFirstName}
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <Label>Apellido</Label>
            <TextInput
              id="last_name"
              value={lastName}
              onChange={setLastName}
              placeholder="Tu apellido"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Alias (¿cómo te gusta que te llamen?)</Label>
            <TextInput
              id="alias"
              value={alias}
              onChange={(v) => setAlias(v.slice(0, 30))}
              placeholder="Ej: Isma, Mel, Nacho"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Celular</Label>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={setPhone}
            />
          </div>
        </div>
      </div>

      {/* ── Datos de cuenta (solo lectura) ── */}
      <div style={cardStyle}>
        {sectionTitle('Cuenta')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Label>Email 🔒</Label>
            <TextInput id="email" value={profile.email} disabled />
          </div>
          <div>
            <Label>Empresa 🔒</Label>
            <TextInput id="company" value={profile.company_name ?? '—'} disabled />
          </div>
          <div>
            <Label>Rol</Label>
            <div style={{ paddingTop: 4 }}>
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{ background: roleStyle.bg, color: roleStyle.color }}
              >
                {roleStyle.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notificaciones ── */}
      <div style={cardStyle}>
        {sectionTitle('Notificaciones')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Toggle
            checked={notifyWhatsapp}
            onChange={setNotifyWhatsapp}
            label="Notificaciones por WhatsApp"
          />
          <Toggle
            checked={notifyEmail}
            onChange={setNotifyEmail}
            label="Notificaciones por Email"
          />
        </div>
      </div>

      {/* ── Feedback y botón ── */}
      {saveError && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: 'rgba(220,38,38,0.06)',
            border:     '1px solid rgba(220,38,38,0.2)',
            color:      'var(--red, #F87171)',
          }}
        >
          {saveError}
        </div>
      )}
      {saved && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: 'rgba(74,222,128,0.08)',
            border:     '1px solid rgba(74,222,128,0.25)',
            color:      '#4ADE80',
          }}
        >
          ✓ Perfil actualizado correctamente
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start py-2.5 px-6 rounded-lg text-sm font-bold transition-all"
        style={{
          background:  saving ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
          color:       '#1A1B2E',
          fontFamily:  'var(--font-syne)',
          cursor:      saving ? 'not-allowed' : 'pointer',
          boxShadow:   saving ? 'none' : '0 2px 12px rgba(232,165,0,0.25)',
          border:      'none',
        }}
      >
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
