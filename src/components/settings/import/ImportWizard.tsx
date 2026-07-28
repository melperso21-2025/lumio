'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ENTITY_DEFS, ENTITY_ORDER, type EntityType, type FieldDef } from '@/lib/import/entityConfig'

// ── Types ─────────────────────────────────────────────────────────────────

interface ImportWizardProps {
  companyId: string
}

interface ValidationResult {
  total: number
  valid: number
  errorCount: number
  warnCount: number
  errors: { row: number; field: string; message: string }[]
  warnings: { row: number; message: string }[]
  preview: Record<string, unknown>[]
}

interface ExecuteResult {
  importLogId: string | null
  success: number
  total: number
  errors: { row: number; message: string }[]
  status: 'success' | 'partial' | 'failed'
}

// ── Styles ────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '12px 14px',
}

const btn = (variant: 'primary' | 'secondary' | 'danger'): React.CSSProperties => ({
  padding: '8px 18px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'var(--font-syne)',
  ...(variant === 'primary'   ? { background: 'linear-gradient(135deg,#F5C842,#F09A1A)', color: '#1A1B2E' } : {}),
  ...(variant === 'secondary' ? { background: 'var(--hover)', color: 'var(--text2)', border: '1px solid var(--border)' } : {}),
  ...(variant === 'danger'    ? { background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)' } : {}),
})

const inputSt: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  color: 'var(--text)',
  fontFamily: 'var(--font-jakarta)',
  padding: '6px 10px',
  borderRadius: 7,
  fontSize: 12,
  outline: 'none',
  width: '100%',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 700,
  color: 'var(--muted)',
  marginBottom: 6,
}

// ── Step indicator ────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ['Entidad', 'Plantilla', 'Mapeo', 'Validar', 'Importar']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, flexShrink: 0 }}>
      {steps.map((label, i) => {
        const idx  = i + 1
        const done = idx < step
        const active = idx === step
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-syne)',
                background: done ? 'var(--green)' : active ? 'linear-gradient(135deg,#F5C842,#F09A1A)' : 'var(--hover)',
                color: done ? '#fff' : active ? '#1A1B2E' : 'var(--muted)',
                border: active ? 'none' : done ? 'none' : '1px solid var(--border2)',
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{ fontSize: 9, color: active ? 'var(--gold)' : 'var(--muted)', fontWeight: active ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </span>
            </div>
            {idx < steps.length && (
              <div style={{ flex: 1, height: 1, background: done ? 'var(--green)' : 'var(--border)', margin: '0 4px', marginBottom: 18 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function ImportWizard({ companyId }: ImportWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1
  const [selectedEntity, setSelectedEntity] = useState<EntityType | null>(null)

  // Step 3
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileHeaders, setFileHeaders]   = useState<string[]>([])
  const [fileRows,    setFileRows]      = useState<string[][]>([])
  const [mapping,     setMapping]       = useState<Record<string, string>>({})  // systemLabel → fileHeader
  const [dragOver,    setDragOver]      = useState(false)
  const [parseError,  setParseError]    = useState<string | null>(null)
  const [validateApiError, setValidateApiError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 4
  const [validating,   setValidating]   = useState(false)
  const [validation,   setValidation]   = useState<ValidationResult | null>(null)
  const [skipDups,     setSkipDups]     = useState(false)

  // Step 5
  const [executing,  setExecuting]  = useState(false)
  const [execResult, setExecResult] = useState<ExecuteResult | null>(null)

  const def = selectedEntity ? ENTITY_DEFS[selectedEntity] : null

  // ── Reset on entity change ──────────────────────────────────────────────
  function resetFromStep3() {
    setUploadedFile(null); setFileHeaders([]); setFileRows([])
    setMapping({}); setParseError(null); setValidateApiError(null); setValidation(null); setExecResult(null)
  }

  // ── Parse uploaded file client-side ────────────────────────────────────
  const parseFile = useCallback(async (file: File) => {
    setParseError(null)
    try {
      // Lazy load xlsx (only needed here)
      const XLSX = (await import('xlsx')).default ?? (await import('xlsx'))
      const ab   = await file.arrayBuffer()
      const wb   = XLSX.read(new Uint8Array(ab), { type: 'array', raw: false })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' }) as string[][]

      if (rows.length < 1) { setParseError('El archivo está vacío'); return }

      const headers = (rows[0] as string[]).map((h) => String(h ?? '').trim()).filter(Boolean)
      if (headers.length === 0) { setParseError('No se encontraron encabezados en la primera fila'); return }

      setFileHeaders(headers)
      setFileRows(rows.slice(1, 6))  // preview first 5 data rows

      // Auto-map: if system field label matches a file header (case-insensitive)
      if (def) {
        const autoMap: Record<string, string> = {}
        def.fields.forEach((f) => {
          const match = headers.find((h) => h.toLowerCase() === f.label.toLowerCase())
          if (match) autoMap[f.label] = match
        })
        setMapping(autoMap)
      }
    } catch (e) {
      setParseError(`Error leyendo archivo: ${(e as Error).message}`)
    }
  }, [def])

  useEffect(() => {
    if (uploadedFile) parseFile(uploadedFile)
  }, [uploadedFile, parseFile])

  // ── File to base64 ─────────────────────────────────────────────────────
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // ── Template download ──────────────────────────────────────────────────
  async function downloadTemplate() {
    if (!selectedEntity) return
    try {
      const res  = await fetch(`/api/import/template?entity=${selectedEntity}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `lumio_plantilla_${selectedEntity}_${new Date().toISOString().slice(0,10)}.xlsx`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  // ── Validate ───────────────────────────────────────────────────────────
  async function runValidation() {
    if (!uploadedFile || !selectedEntity) return
    setValidating(true)
    setValidation(null)
    setValidateApiError(null)
    try {
      const fileData = await fileToBase64(uploadedFile)
      const res = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: selectedEntity, mapping, fileData }),
      })
      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        setValidateApiError(
          typeof data.error === 'string' && data.error
            ? data.error
            : 'Error al validar el archivo'
        )
        return
      }

      const errorsRaw = data.errors
      const errors = Array.isArray(errorsRaw)
        ? (errorsRaw as ValidationResult['errors'])
        : []
      const warningsRaw = data.warnings
      const warnings = Array.isArray(warningsRaw)
        ? (warningsRaw as ValidationResult['warnings'])
        : []
      const previewRaw = data.preview
      const preview = Array.isArray(previewRaw)
        ? (previewRaw as Record<string, unknown>[])
        : []

      const total = typeof data.total === 'number' ? data.total : 0
      const valid = typeof data.valid === 'number' ? data.valid : 0
      const errorCount =
        typeof data.errorCount === 'number' ? data.errorCount : errors.length
      const warnCount =
        typeof data.warnCount === 'number' ? data.warnCount : warnings.length

      setValidation({
        total,
        valid,
        errorCount,
        warnCount,
        errors,
        warnings,
        preview,
      })
      setStep(4)
    } catch {
      setValidateApiError('Error de conexión')
    } finally {
      setValidating(false)
    }
  }

  // ── Execute ────────────────────────────────────────────────────────────
  async function runExecute() {
    if (!uploadedFile || !selectedEntity) return
    setExecuting(true); setExecResult(null)
    try {
      const fileData = await fileToBase64(uploadedFile)
      const res  = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType:     selectedEntity,
          mapping,
          fileData,
          skipDuplicates: skipDups,
          fileName:       uploadedFile.name,
        }),
      })
      const data = await res.json()
      setExecResult(data)
      setStep(5)
    } catch {
      setExecResult({ importLogId: null, success: 0, total: 0, errors: [{ row: 0, message: 'Error de conexión' }], status: 'failed' })
    }
    setExecuting(false)
  }

  // ── Check required fields mapped ───────────────────────────────────────
  const requiredMapped = def
    ? def.fields.filter((f) => f.required).every((f) => !!mapping[f.label])
    : false

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepIndicator step={step} />

      {/* ── STEP 1: Select entity ───────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <p style={sectionLabel}>Selecciona qué tipo de datos quieres importar</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {ENTITY_ORDER.map((key) => {
              const e = ENTITY_DEFS[key]
              const isSelected = selectedEntity === key
              return (
                <div
                  key={key}
                  onClick={() => { setSelectedEntity(key); resetFromStep3() }}
                  style={{
                    ...card,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--gold-bdr)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--gold-bg)' : 'var(--card)',
                    transition: 'all 0.12s',
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: 13, color: isSelected ? 'var(--gold)' : 'var(--text)', margin: '0 0 3px', fontFamily: 'var(--font-syne)' }}>
                    {e.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
                    {e.description}
                  </p>
                  {e.dependencies.length > 0 && (
                    <p style={{ fontSize: 10, color: 'var(--orange)', marginTop: 6, margin: '6px 0 0' }}>
                      Requiere: {e.dependencies.map((d) => ENTITY_DEFS[d].label).join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button
              type="button"
              disabled={!selectedEntity}
              onClick={() => setStep(2)}
              style={{ ...btn('primary'), opacity: !selectedEntity ? 0.5 : 1, cursor: !selectedEntity ? 'not-allowed' : 'pointer' }}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Template & instructions ────────────────────────────── */}
      {step === 2 && def && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: '0 0 4px' }}>
                  {def.label}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{def.description}</p>
                {def.dependencies.length > 0 && (
                  <p style={{ fontSize: 11, color: 'var(--orange)', marginTop: 6 }}>
                    ⚠️ Importa primero: {def.dependencies.map((d) => ENTITY_DEFS[d].label).join(' → ')}
                  </p>
                )}
              </div>
              <button type="button" onClick={downloadTemplate} style={btn('primary')}>
                ⬇ Descargar plantilla Excel
              </button>
            </div>
          </div>

          {/* Column reference */}
          <div style={card}>
            <p style={sectionLabel}>Estructura de columnas</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Columna', 'Tipo', 'Oblig.', 'Ejemplo', 'Nota'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {def.fields.map((f) => (
                    <tr key={f.key} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 10px' }}>
                        <code style={{ fontFamily: 'var(--font-syne)', fontSize: 11, fontWeight: f.required ? 700 : 400, color: f.required ? 'var(--text)' : 'var(--text2)' }}>
                          {f.label}
                        </code>
                      </td>
                      <td style={{ padding: '7px 10px', color: 'var(--muted)', fontSize: 11 }}>{f.type}</td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600, background: f.required ? 'rgba(220,38,38,0.08)' : 'var(--hover)', color: f.required ? 'var(--red)' : 'var(--muted)' }}>
                          {f.required ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: 'var(--text2)', fontSize: 11, fontFamily: 'var(--font-jakarta)' }}>{f.example}</td>
                      <td style={{ padding: '7px 10px', color: 'var(--muted)', fontSize: 10 }}>{f.hint ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => setStep(1)} style={btn('secondary')}>← Atrás</button>
            <button type="button" onClick={() => setStep(3)} style={btn('primary')}>Ya tengo mi archivo →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Upload + column mapping ────────────────────────────── */}
      {step === 3 && def && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (!f) return
              if (f.size > 10 * 1024 * 1024) { setParseError('El archivo supera el límite de 10 MB'); return }
              setUploadedFile(f)
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--gold)' : uploadedFile ? 'var(--green)' : 'var(--border2)'}`,
              borderRadius: 10,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--gold-bg)' : uploadedFile ? 'rgba(5,150,105,0.04)' : 'var(--bg)',
              transition: 'all 0.15s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                if (f.size > 10 * 1024 * 1024) { setParseError('El archivo supera el límite de 10 MB'); return }
                setUploadedFile(f)
              }}
            />
            {uploadedFile ? (
              <>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{uploadedFile.name}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  {fileHeaders.length} columnas detectadas · Clic para cambiar archivo
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); resetFromStep3() }}
                  style={{
                    marginTop: 10,
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid rgba(220,38,38,0.3)',
                    background: 'rgba(220,38,38,0.08)',
                    color: 'var(--red)',
                    fontFamily: 'var(--font-syne)',
                  }}
                >
                  × Eliminar archivo
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
                  Arrastra tu archivo aquí o haz clic para seleccionarlo
                </p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Excel (.xlsx) o CSV · Máx. 5 MB · 5,000 filas
                </p>
              </>
            )}
          </div>

          {parseError && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
              {parseError}
            </div>
          )}

          {validateApiError && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}>
              {validateApiError}
            </div>
          )}

          {/* Column mapping */}
          {fileHeaders.length > 0 && (
            <div style={card}>
              <p style={sectionLabel}>Mapeo de columnas</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                Asocia cada campo del sistema con la columna correspondiente en tu archivo.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {def.fields.map((f: FieldDef) => (
                  <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: f.required ? 700 : 400, color: f.required ? 'var(--text)' : 'var(--text2)' }}>
                        {f.required && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
                        {f.label}
                      </span>
                      {f.hint && <p style={{ fontSize: 9, color: 'var(--muted)', margin: '1px 0 0' }}>{f.hint}</p>}
                    </div>
                    <select
                      value={mapping[f.label] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.label]: e.target.value }))}
                      style={inputSt}
                    >
                      <option value="">— No mapear —</option>
                      {fileHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File preview */}
          {fileRows.length > 0 && fileHeaders.length > 0 && (
            <div style={card}>
              <p style={sectionLabel}>Vista previa del archivo (primeras 5 filas)</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {fileHeaders.map((h) => (
                        <th key={h} style={{ padding: '5px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileRows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                        {fileHeaders.map((_, ci) => (
                          <td key={ci} style={{ padding: '5px 10px', color: 'var(--text2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {String(row[ci] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={() => setStep(2)} style={btn('secondary')}>← Atrás</button>
            <button
              type="button"
              disabled={!uploadedFile || !requiredMapped || validating}
              onClick={runValidation}
              style={{ ...btn('primary'), opacity: (!uploadedFile || !requiredMapped) ? 0.5 : 1, cursor: (!uploadedFile || !requiredMapped) ? 'not-allowed' : 'pointer' }}
            >
              {validating ? '⏳ Validando…' : 'Validar archivo →'}
            </button>
          </div>

          {!requiredMapped && fileHeaders.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--red)', textAlign: 'right', marginTop: -8 }}>
              Faltan campos obligatorios por mapear: {def.fields.filter((f) => f.required && !mapping[f.label]).map((f) => f.label).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ── STEP 4: Validation result ────────────────────────────────────── */}
      {step === 4 && validation && (() => {
        const vErr = validation.errors ?? []
        const vWarn = validation.warnings ?? []
        const vPrev = validation.preview ?? []
        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Summary banner */}
          {validation.errorCount === 0 && (
            <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
              ✓ {validation.valid} de {validation.total} registros listos para importar
              {validation.warnCount > 0 && <span style={{ color: 'var(--orange)', marginLeft: 8 }}>· {validation.warnCount} advertencias</span>}
            </div>
          )}
          {validation.errorCount > 0 && validation.valid > 0 && (
            <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>
              ⚠️ {validation.valid} registros OK · {validation.errorCount} con errores — corrige antes de importar
            </div>
          )}
          {validation.valid === 0 && validation.errorCount > 0 && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
              ✗ {validation.errorCount} errores encontrados — corrige el archivo y vuelve a subir
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Total filas', value: validation.total, color: 'var(--text)' },
              { label: 'Válidas', value: validation.valid, color: 'var(--green)' },
              { label: 'Con errores', value: validation.errorCount, color: 'var(--red)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...card, textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--font-syne)', margin: '0 0 2px' }}>{value}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Preview */}
          {vPrev.length > 0 && (
            <div style={card}>
              <p style={sectionLabel}>Vista previa de registros que se importarían</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {Object.keys(vPrev[0] ?? {}).filter((k) => k !== 'company_id').map((k) => (
                        <th key={k} style={{ padding: '5px 10px', color: 'var(--muted)', fontSize: 10, fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vPrev.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {Object.entries(row).filter(([k]) => k !== 'company_id').map(([k, v]) => (
                          <td key={k} style={{ padding: '5px 10px', color: 'var(--text2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(v ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors table */}
          {vErr.length > 0 && (
            <div style={{ ...card, background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.15)', maxHeight: 280, overflowY: 'auto' }}>
              <p style={{ ...sectionLabel, color: 'var(--red)', marginBottom: 8 }}>Errores por fila</p>
              {vErr.map((e, i) => {
                const parts = e.message.split(' · ')
                return (
                  <div
                    key={i}
                    style={{
                      padding: '6px 0',
                      borderBottom: '1px solid rgba(220,38,38,0.10)',
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', marginBottom: 3 }}>
                      Fila {e.row}
                    </p>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {parts.map((part, j) => (
                        <li
                          key={j}
                          style={{
                            display: 'flex',
                            gap: 5,
                            fontSize: 11,
                            color: 'var(--text2)',
                            lineHeight: 1.45,
                            padding: '1px 0',
                          }}
                        >
                          <span style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }}>•</span>
                          <span>{part.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {/* Warnings */}
          {vWarn.length > 0 && (
            <div style={{ ...card, background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.2)', maxHeight: 180, overflowY: 'auto' }}>
              <p style={{ ...sectionLabel, color: 'var(--orange)', marginBottom: 8 }}>Advertencias de posibles duplicados</p>
              {vWarn.slice(0, 30).map((w, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text2)', padding: '3px 0' }}>
                  Fila {w.row}: {w.message}
                </div>
              ))}
            </div>
          )}

          {/* Skip duplicates option */}
          {validation.warnCount > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
              <input
                type="checkbox"
                checked={skipDups}
                onChange={(e) => setSkipDups(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: 'var(--gold)' }}
              />
              Omitir filas con duplicados detectados
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => setStep(3)} style={btn('secondary')}>← Volver y corregir</button>
            <button
              type="button"
              disabled={validation.valid === 0 || executing}
              onClick={runExecute}
              style={{ ...btn('primary'), opacity: validation.valid === 0 ? 0.5 : 1, cursor: validation.valid === 0 ? 'not-allowed' : 'pointer' }}
            >
              {executing ? '⏳ Importando…' : `Importar ${validation.valid} registros →`}
            </button>
          </div>
        </div>
        )
      })()}

      {/* ── STEP 5: Execute result ───────────────────────────────────────── */}
      {step === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {executing && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'var(--font-syne)', fontWeight: 700 }}>⏳ Procesando importación…</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Esto puede tomar unos segundos para archivos grandes.</p>
            </div>
          )}

          {!executing && execResult && (
            <>
              {execResult.status === 'success' && (
                <div style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 10, padding: '18px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>✅</div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-syne)', margin: '8px 0 4px' }}>
                    Importación exitosa
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {execResult.success} de {execResult.total} registros importados correctamente
                  </p>
                </div>
              )}
              {execResult.status === 'partial' && (
                <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 10, padding: '18px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>⚠️</div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--orange)', fontFamily: 'var(--font-syne)', margin: '8px 0 4px' }}>
                    Importación parcial
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {execResult.success} importados · {execResult.errors.length} con errores
                  </p>
                </div>
              )}
              {execResult.status === 'failed' && (
                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '18px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>❌</div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-syne)', margin: '8px 0 4px' }}>
                    Importación fallida
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                    No se importó ningún registro
                  </p>
                </div>
              )}

              {execResult.errors.length > 0 && (
                <div style={{ ...card, maxHeight: 200, overflowY: 'auto' }}>
                  <p style={{ ...sectionLabel, color: 'var(--red)', marginBottom: 8 }}>Filas con error</p>
                  {execResult.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text2)', padding: '4px 0', borderBottom: '1px solid rgba(220,38,38,0.08)' }}>
                      <strong style={{ color: 'var(--red)' }}>Fila {e.row}:</strong> {e.message}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => { setStep(1); setSelectedEntity(null); resetFromStep3(); setValidation(null); setExecResult(null) }} style={btn('secondary')}>
                  Importar otro archivo
                </button>
                {execResult.importLogId && (
                  <button type="button" onClick={() => router.push('/settings/import?tab=history')} style={btn('primary')}>
                    Ver en historial →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden info bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
        <span>Empresa: {companyId.slice(0, 8)}…</span>
        {selectedEntity && <><span>·</span><span>Entidad: {ENTITY_DEFS[selectedEntity]?.label}</span></>}
        {uploadedFile && <><span>·</span><span>{uploadedFile.name}</span></>}
      </div>
    </div>
  )
}
