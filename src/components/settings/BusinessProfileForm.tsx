'use client'

import { useState } from 'react'

interface BusinessProfile {
  business_description: string
  main_customer_type: string
  avg_monthly_revenue_range: string
}

interface Props {
  initial: BusinessProfile
  companyName: string
  /** Si es true, muestra como modal de bienvenida en vez de sección de settings */
  asModal?: boolean
  onSaved?: () => void
}

const CUSTOMER_TYPE_OPTIONS = [
  {
    value: 'b2c',
    label: 'Consumidor final (B2C)',
    example: 'Ej: tienda de ropa, restaurante, panadería, salón de belleza',
  },
  {
    value: 'b2b',
    label: 'Otras empresas (B2B)',
    example: 'Ej: agencia de marketing, proveedor de insumos, consultora',
  },
  {
    value: 'mixed',
    label: 'Ambos (mixto)',
    example: 'Ej: distribuidora que vende a tiendas y también al público',
  },
]

const REVENUE_OPTIONS = [
  { value: 'lt5k',     label: 'Menos de $5,000 / mes',      sublabel: 'Negocio en etapa inicial o de bajo volumen' },
  { value: '5k_20k',   label: '$5,000 – $20,000 / mes',     sublabel: 'PyME en crecimiento' },
  { value: '20k_100k', label: '$20,000 – $100,000 / mes',   sublabel: 'PyME consolidada' },
  { value: 'gt100k',   label: 'Más de $100,000 / mes',      sublabel: 'Empresa mediana o gran volumen' },
]

const inputBase: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  fontSize: 14,
  borderRadius: 10,
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
  width: '100%',
  boxSizing: 'border-box',
}

function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--gold)'
  e.target.style.boxShadow = '0 0 0 3px var(--gold-bg)'
}
function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'var(--border2)'
  e.target.style.boxShadow = 'none'
}

export default function BusinessProfileForm({ initial, companyName, asModal, onSaved }: Props) {
  const [form, setForm] = useState<BusinessProfile>({
    business_description:      initial.business_description ?? '',
    main_customer_type:        initial.main_customer_type ?? '',
    avg_monthly_revenue_range: initial.avg_monthly_revenue_range ?? '',
  })
  const [loading, setLoading]   = useState(false)
  const [saved,   setSaved]     = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  const isComplete =
    form.business_description.trim().length >= 20 &&
    form.main_customer_type !== '' &&
    form.avg_monthly_revenue_range !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isComplete) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/company/business-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json() as { error?: string }
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'No se pudo guardar.')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    onSaved?.()
  }

  const selectedCustomerType = CUSTOMER_TYPE_OPTIONS.find(o => o.value === form.main_customer_type)

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Descripción del negocio */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          ¿A qué se dedica {companyName}?
          <span style={{ color: 'var(--gold)', marginLeft: 4 }}>*</span>
        </label>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
          Describe con tus propias palabras qué vendes, a quién y cómo. Cuanto más específico, mejor será el análisis de IA.
        </p>

        {/* Ejemplo visual */}
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 10,
          background: 'rgba(245,200,66,0.06)',
          border: '1px dashed rgba(245,200,66,0.3)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
            ✦ Ejemplo de una buena descripción
          </div>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
            "Somos una tienda de ropa femenina en Quito. Vendemos ropa casual y de moda a mujeres de 20 a 40 años, principalmente por Instagram y en nuestro local del norte. Nuestros productos van de $15 a $80 y la temporada alta es diciembre y el Día de la Madre."
          </p>
        </div>

        <textarea
          value={form.business_description}
          onChange={e => setForm(f => ({ ...f, business_description: e.target.value }))}
          placeholder="Ej: Somos una ferretería familiar en Guayaquil. Vendemos materiales de construcción y herramientas a contratistas y personas que remodelan su casa. Tenemos local físico y también hacemos entregas a domicilio..."
          rows={4}
          style={{ ...inputBase, padding: '10px 14px', resize: 'vertical', lineHeight: 1.6 }}
          onFocus={onFocus}
          onBlur={onBlur}
          maxLength={600}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {form.business_description.trim().length > 0 && form.business_description.trim().length < 20 && (
            <span style={{ fontSize: 11, color: 'var(--red)' }}>Escribe al menos 20 caracteres</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
            {form.business_description.length}/600
          </span>
        </div>
      </div>

      {/* Tipo de cliente */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          ¿A quién le vendes principalmente?
          <span style={{ color: 'var(--gold)', marginLeft: 4 }}>*</span>
        </label>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
          Esto ayuda a la IA a entender tu ciclo de ventas y cómo darte consejos apropiados.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CUSTOMER_TYPE_OPTIONS.map(opt => {
            const selected = form.main_customer_type === opt.value
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${selected ? 'rgba(245,200,66,0.5)' : 'var(--border2)'}`,
                  background: selected ? 'rgba(245,200,66,0.07)' : 'var(--hover)',
                  transition: 'border-color 120ms, background 120ms',
                }}
              >
                <input
                  type="radio"
                  name="main_customer_type"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setForm(f => ({ ...f, main_customer_type: opt.value }))}
                  style={{ marginTop: 2, accentColor: 'var(--gold)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {opt.example}
                  </div>
                </div>
              </label>
            )
          })}
        </div>

        {selectedCustomerType && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <span style={{ fontSize: 12, color: '#818CF8' }}>
              {form.main_customer_type === 'b2b'
                ? '💡 Para negocios B2B, la IA pondrá más atención en el flujo de CxC y los ciclos de pago largos.'
                : form.main_customer_type === 'b2c'
                ? '💡 Para negocios B2C, la IA enfocará sus análisis en ticket promedio, frecuencia de compra y retención.'
                : '💡 Para negocios mixtos, la IA diferenciará los patrones de cada tipo de cliente en sus análisis.'}
            </span>
          </div>
        )}
      </div>

      {/* Facturación mensual */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          ¿Cuánto factura el negocio aproximadamente por mes?
          <span style={{ color: 'var(--gold)', marginLeft: 4 }}>*</span>
        </label>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
          Es un rango, no tiene que ser exacto. Esto le permite a la IA saber qué es "mucho" o "poco" dinero para tu negocio.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {REVENUE_OPTIONS.map(opt => {
            const selected = form.avg_monthly_revenue_range === opt.value
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${selected ? 'rgba(245,200,66,0.5)' : 'var(--border2)'}`,
                  background: selected ? 'rgba(245,200,66,0.07)' : 'var(--hover)',
                  transition: 'border-color 120ms, background 120ms',
                }}
              >
                <input
                  type="radio"
                  name="avg_monthly_revenue_range"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setForm(f => ({ ...f, avg_monthly_revenue_range: opt.value }))}
                  style={{ marginTop: 3, accentColor: 'var(--gold)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {opt.sublabel}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#F87171',
        }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="submit"
          disabled={loading || !isComplete}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: !isComplete || loading
              ? 'rgba(245,200,66,0.3)'
              : 'linear-gradient(135deg, #F5C842, #F09A1A)',
            color: '#1A1B2E', fontWeight: 700, fontSize: 14,
            fontFamily: 'var(--font-syne)',
            cursor: !isComplete || loading ? 'not-allowed' : 'pointer',
            transition: 'opacity 150ms',
          }}
        >
          {loading ? 'Guardando…' : asModal ? 'Guardar y continuar →' : 'Guardar cambios'}
        </button>

        {saved && (
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
            ✓ Guardado correctamente
          </span>
        )}

        {!isComplete && !loading && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Completa los 3 campos para guardar
          </span>
        )}
      </div>

      {asModal && (
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
          Puedes actualizar esta información en cualquier momento desde Configuración → Mi negocio.
        </p>
      )}
    </form>
  )
}
