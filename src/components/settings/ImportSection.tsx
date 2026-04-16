'use client'

import { useState, useRef } from 'react'

// ── Tipos ─────────────────────────────────────────────────────
interface Channel {
  id: string
  name: string
  type: string
}

interface Category {
  id: string
  name: string
}

interface ImportSectionProps {
  type: 'sales' | 'customers' | 'products'
  title: string
  description: string
  companyId: string
  channels?: Channel[]
  categories?: Category[]
}

interface ImportResult {
  success: number
  errors: { row: number; message: string }[]
  total: number
}

// ── Plantillas CSV ───────────────────────────────────────────
const SALES_TEMPLATE = [
  [
    'fecha',
    'total',
    'descuento',
    'costo_produccion',
    'lineas_por_pedido',
    'canal',
    'estado',
    'notas',
    'cliente',
    'sucursal',
  ],
  [
    '2026-03-01',
    '150.00',
    '0',
    '80.00',
    '2',
    'Web',
    'cerrada',
    'Venta online',
    'Juan Pérez',
    'Matriz Quito',
  ],
  [
    '2026-03-02',
    '320.50',
    '10.00',
    '180.00',
    '3',
    'Local Megamaxi',
    'cerrada',
    '',
    'María García',
    'Matriz Quito',
  ],
  [
    '2026-03-03',
    '89.00',
    '0',
    '45.00',
    '1',
    'WhatsApp',
    'revision',
    'Pendiente confirmación',
    'Empresa ABC S.A.',
    'Sucursal Norte',
  ],
]

const CUSTOMERS_TEMPLATE = [
  ['nombre', 'telefono', 'email', 'tipo', 'etiqueta', 'cliente_desde'],
  [
    'María García',
    '+593991234567',
    'maria@email.com',
    'retail',
    'frecuente',
    '2024-01-15',
  ],
  [
    'Empresa ABC S.A.',
    '+593022345678',
    'compras@abc.com',
    'b2b',
    'vip',
    '2023-06-01',
  ],
  ['Juan Pérez', '+593987654321', '', 'retail', 'nuevo', '2026-03-01'],
]

const PRODUCTS_TEMPLATE = [
  [
    'nombre',
    'sku',
    'categoria',
    'precio_venta',
    'costo_unitario',
    'stock_inicial',
    'stock_minimo',
    'dias_reposicion',
  ],
  [
    'Bolso de Cuero Marrón',
    'BOL-001',
    'Bolsos',
    '89.99',
    '45.00',
    '10',
    '2',
    '3',
  ],
  [
    'Billetera Slim Negra',
    'BIL-002',
    'Billeteras',
    '34.50',
    '18.00',
    '25',
    '5',
    '1',
  ],
  [
    'Mochila Ejecutiva',
    'MOC-003',
    'Maletines',
    '125.00',
    '65.00',
    '8',
    '2',
    '5',
  ],
]

// ── Componente helper ColumnRow ───────────────────────────────
function ColumnRow({
  col,
  tipo,
  req,
  ejemplo,
}: {
  col: string
  tipo: string
  req: boolean
  ejemplo: string
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '6px 10px' }}>
        <code
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: 11,
            color: req ? 'var(--text)' : 'var(--text2)',
            fontWeight: req ? 600 : 400,
          }}
        >
          {col}
        </code>
      </td>
      <td
        style={{
          padding: '6px 10px',
          color: 'var(--muted)',
          fontSize: 11,
        }}
      >
        {tipo}
      </td>
      <td style={{ padding: '6px 10px' }}>
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            fontWeight: 600,
            background: req ? 'rgba(220,38,38,0.08)' : 'var(--hover)',
            color: req ? 'var(--red)' : 'var(--muted)',
          }}
        >
          {req ? 'Requerido' : 'Opcional'}
        </span>
      </td>
      <td
        style={{
          padding: '6px 10px',
          color: 'var(--text2)',
          fontSize: 11,
        }}
      >
        {ejemplo}
      </td>
    </tr>
  )
}

// ── Componente principal ───────────────────────────────────────
export default function ImportSection({
  type,
  title,
  description,
  companyId,
  channels = [],
  categories = [],
}: ImportSectionProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const rows =
      type === 'sales'
        ? SALES_TEMPLATE
        : type === 'customers'
          ? CUSTOMERS_TEMPLATE
          : PRODUCTS_TEMPLATE

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            if (
              cell.includes(',') ||
              cell.includes('"') ||
              cell.includes('\n')
            ) {
              return `"${cell.replace(/"/g, '""')}"`
            }
            return cell
          })
          .join(',')
      )
      .join('\n')

    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lumio_plantilla_${type}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setResults({
        success: 0,
        errors: [{ row: 0, message: 'El archivo debe ser .csv' }],
        total: 0,
      })
      return
    }

    setLoading(true)
    setResults(null)

    const text = await file.text()
    const clean = text.replace(/^\uFEFF/, '')

    const lines = clean.split('\n').filter((l) => l.trim())
    if (lines.length < 2) {
      setResults({
        success: 0,
        errors: [
          {
            row: 0,
            message: 'El archivo está vacío o solo tiene encabezados',
          },
        ],
        total: 0,
      })
      setLoading(false)
      return
    }

    const dataLines = lines.slice(1)

    try {
      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          companyId,
          rows: dataLines.map((line) => {
            const result: string[] = []
            let current = ''
            let inQuotes = false
            for (let i = 0; i < line.length; i++) {
              const char = line[i]
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  current += '"'
                  i++
                } else {
                  inQuotes = !inQuotes
                }
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
              } else {
                current += char
              }
            }
            result.push(current.trim())
            return result
          }),
          channels,
          categories,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setResults({
          success: 0,
          errors: [{ row: 0, message: data.error ?? 'Error al procesar' }],
          total: 0,
        })
      } else {
        setResults(data)
      }
    } catch {
      setResults({
        success: 0,
        errors: [{ row: 0, message: 'Error de conexión' }],
        total: 0,
      })
    }

    setLoading(false)
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            className="font-syne font-bold"
            style={{
              fontSize: 15,
              color: 'var(--text)',
              marginBottom: 4,
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            border: '1px solid var(--gold-bdr)',
            background: 'var(--gold-bg)',
            color: 'var(--gold)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ⬇ Descargar plantilla
        </button>
      </div>

      {/* Tabla de referencia de columnas */}
      <details style={{ marginBottom: 12 }}>
        <summary
          style={{
            fontSize: 11,
            color: 'var(--text2)',
            cursor: 'pointer',
            padding: '6px 0',
            userSelect: 'none',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: 'var(--gold)' }}>▶</span>
          Ver estructura de columnas requeridas
        </summary>
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[
                  'Columna',
                  'Tipo',
                  'Obligatorio',
                  'Valores válidos / Ejemplo',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      color: 'var(--muted)',
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {type === 'sales' && (
                <>
                  <ColumnRow
                    col="fecha"
                    tipo="Fecha"
                    req={true}
                    ejemplo="2026-03-15 (YYYY-MM-DD)"
                  />
                  <ColumnRow
                    col="total"
                    tipo="Número"
                    req={true}
                    ejemplo="150.00"
                  />
                  <ColumnRow
                    col="descuento"
                    tipo="Número"
                    req={false}
                    ejemplo="0 o 10.50"
                  />
                  <ColumnRow
                    col="costo_produccion"
                    tipo="Número"
                    req={false}
                    ejemplo="80.00"
                  />
                  <ColumnRow
                    col="lineas_por_pedido"
                    tipo="Entero"
                    req={false}
                    ejemplo="2"
                  />
                  <ColumnRow
                    col="canal"
                    tipo="Texto"
                    req={false}
                    ejemplo={
                      channels
                        .slice(0, 2)
                        .map((c) => c.name)
                        .join(' | ') || 'Web | Local'
                    }
                  />
                  <ColumnRow
                    col="estado"
                    tipo="Texto"
                    req={false}
                    ejemplo="cerrada | revision | contacto | anulada"
                  />
                  <ColumnRow
                    col="notas"
                    tipo="Texto"
                    req={false}
                    ejemplo="Cualquier observación"
                  />
                  <ColumnRow
                    col="cliente"
                    tipo="Texto"
                    req={true}
                    ejemplo="Juan Pérez"
                  />
                  <ColumnRow
                    col="sucursal"
                    tipo="Texto"
                    req={true}
                    ejemplo="Matriz Quito"
                  />
                </>
              )}
              {type === 'customers' && (
                <>
                  <ColumnRow
                    col="nombre"
                    tipo="Texto"
                    req={true}
                    ejemplo="María García"
                  />
                  <ColumnRow
                    col="telefono"
                    tipo="Texto"
                    req={false}
                    ejemplo="+593991234567"
                  />
                  <ColumnRow
                    col="email"
                    tipo="Email"
                    req={false}
                    ejemplo="cliente@email.com"
                  />
                  <ColumnRow
                    col="tipo"
                    tipo="Texto"
                    req={false}
                    ejemplo="retail | wholesale | occasional | b2b"
                  />
                  <ColumnRow
                    col="etiqueta"
                    tipo="Texto"
                    req={false}
                    ejemplo="nuevo | frecuente | vip | recuperar"
                  />
                  <ColumnRow
                    col="cliente_desde"
                    tipo="Fecha"
                    req={false}
                    ejemplo="2024-01-15 (YYYY-MM-DD)"
                  />
                </>
              )}
              {type === 'products' && (
                <>
                  <ColumnRow
                    col="nombre"
                    tipo="Texto"
                    req={true}
                    ejemplo="Bolso de Cuero"
                  />
                  <ColumnRow
                    col="sku"
                    tipo="Texto"
                    req={false}
                    ejemplo="BOL-001"
                  />
                  <ColumnRow
                    col="categoria"
                    tipo="Texto"
                    req={false}
                    ejemplo={
                      categories
                        .slice(0, 2)
                        .map((c) => c.name)
                        .join(' | ') || 'Bolsos | Billeteras'
                    }
                  />
                  <ColumnRow
                    col="precio_venta"
                    tipo="Número"
                    req={true}
                    ejemplo="89.99"
                  />
                  <ColumnRow
                    col="costo_unitario"
                    tipo="Número"
                    req={false}
                    ejemplo="45.00"
                  />
                  <ColumnRow
                    col="stock_inicial"
                    tipo="Entero"
                    req={false}
                    ejemplo="10"
                  />
                  <ColumnRow
                    col="stock_minimo"
                    tipo="Entero"
                    req={false}
                    ejemplo="2"
                  />
                  <ColumnRow
                    col="dias_reposicion"
                    tipo="Entero"
                    req={false}
                    ejemplo="3"
                  />
                </>
              )}
            </tbody>
          </table>
        </div>
      </details>

      {/* Zona de drop / upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--gold)' : 'var(--border2)'}`,
          borderRadius: 10,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: dragOver ? 'var(--gold-bg)' : 'var(--bg)',
          transition: 'all 0.15s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        {loading ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--gold)',
              fontFamily: 'var(--font-syne)',
              fontWeight: 600,
            }}
          >
            ⏳ Procesando archivo...
          </p>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text2)',
                fontWeight: 500,
              }}
            >
              Arrastra tu CSV aquí o haz clic para seleccionarlo
            </p>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Solo archivos .csv · Máximo 1,000 filas por archivo
            </p>
          </>
        )}
      </div>

      {/* Resultados de importación */}
      {results && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(5,150,105,0.08)',
                border: '1px solid rgba(5,150,105,0.2)',
                fontSize: 12,
                color: 'var(--green)',
                fontWeight: 600,
              }}
            >
              ✓ {results.success} de {results.total} filas importadas correctamente
            </div>
            {results.errors.length > 0 && (
              <div
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  fontSize: 12,
                  color: 'var(--red)',
                  fontWeight: 600,
                }}
              >
                ✗ {results.errors.length} filas con error
              </div>
            )}
          </div>

          {results.errors.length > 0 && (
            <div
              style={{
                background: 'rgba(220,38,38,0.04)',
                border: '1px solid rgba(220,38,38,0.15)',
                borderRadius: 8,
                padding: 12,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--red)',
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Errores por fila:
              </p>
              {results.errors.map((err, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    color: 'var(--text2)',
                    padding: '3px 0',
                    borderBottom:
                      '1px solid rgba(220,38,38,0.1)',
                  }}
                >
                  <strong style={{ color: 'var(--red)' }}>
                    {err.row === 0 ? 'Archivo' : `Fila ${err.row}`}:
                  </strong>{' '}
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
