# PROMPT — Módulo Importar Datos

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Sigue el patrón de src/app/(dashboard)/customers/page.tsx para Server Components
- Sigue el patrón de src/components/customers/NewCustomerForm.tsx para Client Components
- Soft delete: SIEMPRE .is('deleted_at', null) en queries

## Tarea
Crea TRES archivos NUEVOS. NO modifiques ningún archivo existente.

---

## ARCHIVO 1: src/app/(dashboard)/settings/import/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import ImportSection from '@/components/settings/ImportSection'
```

### Lógica de datos
```typescript
// 1. Auth
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

const { data: userData } = await supabase
  .from('users')
  .select('company_id, role, is_pulse_admin')
  .eq('id', user.id)
  .single()

const companyId = userData?.company_id
const userRole = userData?.role
const isPulseAdmin = userData?.is_pulse_admin ?? false
const canImport = userRole === 'admin' || isPulseAdmin

// Si no hay companyId → mensaje igual que otros módulos

// 2. Obtener canales y categorías para mapeo en importación
const { data: channelsList } = await supabase
  .from('sales_channels')
  .select('id, name, type')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .order('name')

const { data: categoriesList } = await supabase
  .from('product_categories')
  .select('id, name')
  .eq('company_id', companyId)
  .is('deleted_at', null)
  .order('name')

const channels = channelsList ?? []
const categories = categoriesList ?? []
```

### JSX — estructura exacta

**Sección 1 — Topbar:**
```tsx
<Topbar pageTitle="Importar datos" pageSubtitle="Carga masiva desde CSV" />
```

**Sección 2 — Si no puede importar:**
```tsx
{!canImport && (
  <AiInsightBox
    variant="blue"
    title="Acceso restringido"
    text="Solo los administradores pueden importar datos masivos."
  />
)}
```

**Sección 3 — Si puede importar, mostrar AiInsightBox informativo:**
```tsx
{canImport && (
  <AiInsightBox
    variant="gold"
    title="✦ Cómo funciona la importación"
    text="Descarga la plantilla CSV del tipo de datos que quieres importar, complétala con tu información y súbela. Lumio validará cada fila antes de guardar. Los errores se muestran fila por fila para que puedas corregirlos."
  />
)}
```

**Sección 4 — 3 ImportSection en flex column gap 20:**

```tsx
{canImport && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <ImportSection
      type="sales"
      title="Importar ventas"
      description="Carga el historial de transacciones de ventas."
      companyId={companyId}
      channels={channels}
    />
    <ImportSection
      type="customers"
      title="Importar clientes"
      description="Carga tu base de datos de clientes existente."
      companyId={companyId}
      channels={channels}
    />
    <ImportSection
      type="products"
      title="Importar productos"
      description="Carga tu catálogo de productos e inventario inicial."
      companyId={companyId}
      categories={categories}
    />
  </div>
)}
```

---

## ARCHIVO 2: src/components/settings/ImportSection.tsx

### Tipo
'use client'

### Props
```typescript
interface Channel    { id: string; name: string; type: string }
interface Category   { id: string; name: string }

interface ImportSectionProps {
  type:        'sales' | 'customers' | 'products'
  title:       string
  description: string
  companyId:   string
  channels?:   Channel[]
  categories?: Category[]
}
```

### Estado
```typescript
const [loading,   setLoading]   = useState(false)
const [results,   setResults]   = useState<ImportResult | null>(null)
const [dragOver,  setDragOver]  = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)

interface ImportResult {
  success:  number
  errors:   { row: number; message: string }[]
  total:    number
}
```

### Plantillas CSV — definición exacta de columnas

**VENTAS (type === 'sales'):**
```typescript
const SALES_TEMPLATE = [
  ['fecha', 'total', 'descuento', 'costo_produccion', 'lineas_por_pedido', 'canal', 'estado', 'notas'],
  ['2026-03-01', '150.00', '0', '80.00', '2', 'Web', 'cerrada', 'Venta online'],
  ['2026-03-02', '320.50', '10.00', '180.00', '3', 'Local Megamaxi', 'cerrada', ''],
  ['2026-03-03', '89.00', '0', '45.00', '1', 'WhatsApp', 'revision', 'Pendiente confirmación'],
]

// Valores válidos para "estado": cerrada | revision | contacto | anulada
// Valores para "canal": debe coincidir con el nombre del canal en Lumio
// fecha: formato YYYY-MM-DD
```

**CLIENTES (type === 'customers'):**
```typescript
const CUSTOMERS_TEMPLATE = [
  ['nombre', 'telefono', 'email', 'tipo', 'etiqueta', 'cliente_desde'],
  ['María García', '+593991234567', 'maria@email.com', 'retail', 'frecuente', '2024-01-15'],
  ['Empresa ABC S.A.', '+593022345678', 'compras@abc.com', 'b2b', 'vip', '2023-06-01'],
  ['Juan Pérez', '+593987654321', '', 'retail', 'nuevo', '2026-03-01'],
]

// tipo: retail | wholesale | occasional | b2b
// etiqueta: vip | frecuente | nuevo | recuperar
```

**PRODUCTOS (type === 'products'):**
```typescript
const PRODUCTS_TEMPLATE = [
  ['nombre', 'sku', 'categoria', 'precio_venta', 'costo_unitario', 'stock_inicial', 'stock_minimo', 'dias_reposicion'],
  ['Bolso de Cuero Marrón', 'BOL-001', 'Bolsos', '89.99', '45.00', '10', '2', '3'],
  ['Billetera Slim Negra', 'BIL-002', 'Billeteras', '34.50', '18.00', '25', '5', '1'],
  ['Mochila Ejecutiva', 'MOC-003', 'Maletines', '125.00', '65.00', '8', '2', '5'],
]

// categoria: debe coincidir con categorías creadas en Lumio
// stock_minimo: alerta cuando el stock llega a este número
// dias_reposicion: días mínimos para conseguir el producto
```

### Función downloadTemplate
```typescript
function downloadTemplate() {
  const rows = type === 'sales'
    ? SALES_TEMPLATE
    : type === 'customers'
    ? CUSTOMERS_TEMPLATE
    : PRODUCTS_TEMPLATE

  // Convertir a CSV
  const csv = rows.map(row =>
    row.map(cell => {
      // Escapar celdas con comas o comillas
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`
      }
      return cell
    }).join(',')
  ).join('\n')

  // Agregar BOM para que Excel abra correctamente con tildes
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `lumio_plantilla_${type}_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
```

### Función handleFile — parsear y procesar el CSV
```typescript
async function handleFile(file: File) {
  if (!file.name.endsWith('.csv')) {
    setResults({ success: 0, errors: [{ row: 0, message: 'El archivo debe ser .csv' }], total: 0 })
    return
  }

  setLoading(true)
  setResults(null)

  const text = await file.text()

  // Eliminar BOM si existe
  const clean = text.replace(/^\uFEFF/, '')

  // Parsear CSV simple (split por líneas y comas)
  // Manejar celdas con comillas
  const lines = clean.split('\n').filter(l => l.trim())
  if (lines.length < 2) {
    setResults({ success: 0, errors: [{ row: 0, message: 'El archivo está vacío o solo tiene encabezados' }], total: 0 })
    setLoading(false)
    return
  }

  // Ignorar la primera fila (encabezados)
  const dataLines = lines.slice(1)

  // Llamar al API route con los datos parseados
  try {
    const response = await fetch('/api/import/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        companyId,
        rows: dataLines.map(line => {
          // Parser CSV básico que maneja comillas
          const result: string[] = []
          let current = ''
          let inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
              if (inQuotes && line[i+1] === '"') { current += '"'; i++ }
              else inQuotes = !inQuotes
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
    setResults(data)
  } catch {
    setResults({ success: 0, errors: [{ row: 0, message: 'Error de conexión' }], total: 0 })
  }

  setLoading(false)
}
```

### JSX — estructura del componente

```tsx
<div style={{
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 20
}}>
  {/* Header */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
    <div>
      <h2 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
        {title}
      </h2>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>{description}</p>
    </div>
    {/* Botón descargar plantilla */}
    <button
      type="button"
      onClick={downloadTemplate}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
        border: '1px solid var(--gold-bdr)', background: 'var(--gold-bg)',
        color: 'var(--gold)', cursor: 'pointer', flexShrink: 0,
      }}
    >
      ⬇ Descargar plantilla
    </button>
  </div>

  {/* Tabla de referencia de columnas */}
  <details style={{ marginBottom: 16 }}>
    <summary style={{
      fontSize: 11, color: 'var(--text2)', cursor: 'pointer',
      padding: '6px 0', userSelect: 'none',
      listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6
    }}>
      <span style={{ color: 'var(--gold)' }}>▶</span>
      Ver estructura de columnas requeridas
    </summary>
    <div style={{ marginTop: 10, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Columna', 'Tipo', 'Obligatorio', 'Valores válidos / Ejemplo'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--muted)', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Filas según el tipo */}
          {type === 'sales' && <>
            <ColumnRow col="fecha"             tipo="Fecha"   req={true}  ejemplo="2026-03-15 (YYYY-MM-DD)" />
            <ColumnRow col="total"             tipo="Número"  req={true}  ejemplo="150.00" />
            <ColumnRow col="descuento"         tipo="Número"  req={false} ejemplo="0 o 10.50" />
            <ColumnRow col="costo_produccion"  tipo="Número"  req={false} ejemplo="80.00" />
            <ColumnRow col="lineas_por_pedido" tipo="Entero"  req={false} ejemplo="2" />
            <ColumnRow col="canal"             tipo="Texto"   req={false} ejemplo={`${channels.slice(0,2).map(c=>c.name).join(' | ') || 'Web | Local'}`} />
            <ColumnRow col="estado"            tipo="Texto"   req={false} ejemplo="cerrada | revision | contacto | anulada" />
            <ColumnRow col="notas"             tipo="Texto"   req={false} ejemplo="Cualquier observación" />
          </>}
          {type === 'customers' && <>
            <ColumnRow col="nombre"        tipo="Texto"  req={true}  ejemplo="María García" />
            <ColumnRow col="telefono"      tipo="Texto"  req={false} ejemplo="+593991234567" />
            <ColumnRow col="email"         tipo="Email"  req={false} ejemplo="cliente@email.com" />
            <ColumnRow col="tipo"          tipo="Texto"  req={false} ejemplo="retail | wholesale | occasional | b2b" />
            <ColumnRow col="etiqueta"      tipo="Texto"  req={false} ejemplo="nuevo | frecuente | vip | recuperar" />
            <ColumnRow col="cliente_desde" tipo="Fecha"  req={false} ejemplo="2024-01-15 (YYYY-MM-DD)" />
          </>}
          {type === 'products' && <>
            <ColumnRow col="nombre"           tipo="Texto"  req={true}  ejemplo="Bolso de Cuero" />
            <ColumnRow col="sku"              tipo="Texto"  req={false} ejemplo="BOL-001" />
            <ColumnRow col="categoria"        tipo="Texto"  req={false} ejemplo={`${categories.slice(0,2).map(c=>c.name).join(' | ') || 'Bolsos | Billeteras'}`} />
            <ColumnRow col="precio_venta"     tipo="Número" req={true}  ejemplo="89.99" />
            <ColumnRow col="costo_unitario"   tipo="Número" req={false} ejemplo="45.00" />
            <ColumnRow col="stock_inicial"    tipo="Entero" req={false} ejemplo="10" />
            <ColumnRow col="stock_minimo"     tipo="Entero" req={false} ejemplo="2" />
            <ColumnRow col="dias_reposicion"  tipo="Entero" req={false} ejemplo="3" />
          </>}
        </tbody>
      </table>
    </div>
  </details>

  {/* Zona de drop / upload */}
  <div
    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
    onDragLeave={() => setDragOver(false)}
    onDrop={e => {
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
      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
    />
    {loading ? (
      <p style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'var(--font-syne)', fontWeight: 600 }}>
        ⏳ Procesando archivo...
      </p>
    ) : (
      <>
        <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
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
      {/* Resumen */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 12
      }}>
        <div style={{
          flex: 1, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)',
          fontSize: 12, color: 'var(--green)', fontWeight: 600
        }}>
          ✓ {results.success} de {results.total} filas importadas correctamente
        </div>
        {results.errors.length > 0 && (
          <div style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
            fontSize: 12, color: 'var(--red)', fontWeight: 600
          }}>
            ✗ {results.errors.length} filas con error
          </div>
        )}
      </div>

      {/* Lista de errores */}
      {results.errors.length > 0 && (
        <div style={{
          background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: 8, padding: 12, maxHeight: 200, overflowY: 'auto'
        }}>
          <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>
            Errores por fila:
          </p>
          {results.errors.map((err, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text2)', padding: '3px 0', borderBottom: '1px solid rgba(220,38,38,0.1)' }}>
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
```

### Componente interno ColumnRow
```typescript
// Componente helper para la tabla de columnas — definir dentro del mismo archivo
function ColumnRow({ col, tipo, req, ejemplo }: {
  col: string; tipo: string; req: boolean; ejemplo: string
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '6px 10px' }}>
        <code style={{
          fontFamily: 'var(--font-syne)', fontSize: 11,
          color: req ? 'var(--text)' : 'var(--text2)', fontWeight: req ? 600 : 400
        }}>{col}</code>
      </td>
      <td style={{ padding: '6px 10px', color: 'var(--muted)', fontSize: 11 }}>{tipo}</td>
      <td style={{ padding: '6px 10px' }}>
        <span style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
          background: req ? 'rgba(220,38,38,0.08)' : 'var(--hover)',
          color: req ? 'var(--red)' : 'var(--muted)'
        }}>
          {req ? 'Requerido' : 'Opcional'}
        </span>
      </td>
      <td style={{ padding: '6px 10px', color: 'var(--text2)', fontSize: 11 }}>{ejemplo}</td>
    </tr>
  )
}
```

---

## ARCHIVO 3: src/app/api/import/process/route.ts

### Tipo
API Route — Next.js App Router

### Imports
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
```

### Lógica — procesamiento por tipo

```typescript
export async function POST(request: NextRequest) {
  try {
    const { type, companyId, rows, channels, categories } = await request.json()

    const supabase = await createClient()

    // 1. Verificar auth y permisos
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users').select('role, is_pulse_admin, company_id').eq('id', user.id).single()

    if (userData?.role !== 'admin' && !userData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Sin permisos para importar datos' }, { status: 403 })
    }

    if (userData?.company_id !== companyId && !userData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Sin permisos para esta empresa' }, { status: 403 })
    }

    // 2. Limitar filas
    if (rows.length > 1000) {
      return NextResponse.json({ error: 'Máximo 1,000 filas por importación' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)
    let success = 0
    const errors: { row: number; message: string }[] = []

    // ── IMPORTAR VENTAS ──────────────────────────────────────
    if (type === 'sales') {
      // Índices: 0=fecha, 1=total, 2=descuento, 3=costo_prod, 4=lineas, 5=canal, 6=estado, 7=notas
      const channelsMap: Record<string, string> = {}
      if (channels) {
        channels.forEach((c: { id: string; name: string }) => {
          channelsMap[c.name.toLowerCase().trim()] = c.id
        })
      }

      const validStatuses = ['cerrada', 'revision', 'contacto', 'anulada']
      const statusMap: Record<string, string> = {
        cerrada: 'closed', revision: 'review', contacto: 'contact', anulada: 'cancelled'
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2 // +2 porque la fila 1 es encabezado

        // Validar fecha
        const saleDate = row[0]?.trim()
        if (!saleDate || !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
          errors.push({ row: rowNum, message: `Fecha inválida: "${saleDate}". Usa formato YYYY-MM-DD` })
          continue
        }

        // Validar total
        const total = parseFloat(row[1]?.trim() || '')
        if (isNaN(total) || total < 0) {
          errors.push({ row: rowNum, message: `Total inválido: "${row[1]}". Debe ser un número positivo` })
          continue
        }

        const discount = parseFloat(row[2]?.trim() || '0') || 0
        const cost = parseFloat(row[3]?.trim() || '0') || 0
        const lpp = parseInt(row[4]?.trim() || '1') || 1
        const channelName = row[5]?.trim().toLowerCase()
        const channelId = channelName ? channelsMap[channelName] : null
        const statusRaw = row[6]?.trim().toLowerCase()
        const status = statusRaw && validStatuses.includes(statusRaw)
          ? statusMap[statusRaw] : 'closed'
        const notes = row[7]?.trim() || null

        const { error: insertError } = await supabase.from('sales').insert({
          company_id:       companyId,
          sale_date:        saleDate,
          gross_total:      total,
          discount_amount:  discount,
          production_cost:  cost,
          lines_per_order:  lpp,
          channel_id:       channelId || null,
          status,
          notes,
        })

        if (insertError) {
          errors.push({ row: rowNum, message: insertError.message })
        } else {
          success++
        }
      }
    }

    // ── IMPORTAR CLIENTES ────────────────────────────────────
    else if (type === 'customers') {
      // Índices: 0=nombre, 1=telefono, 2=email, 3=tipo, 4=etiqueta, 5=cliente_desde
      const validTypes   = ['retail', 'wholesale', 'occasional', 'b2b']
      const validLabels  = ['vip', 'frecuente', 'nuevo', 'recuperar']
      const labelMap: Record<string, string> = {
        vip: 'vip', frecuente: 'frequent', nuevo: 'new', recuperar: 'recovery'
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        const fullName = row[0]?.trim()
        if (!fullName) {
          errors.push({ row: rowNum, message: 'El nombre es obligatorio' })
          continue
        }

        const phone = row[1]?.trim() || null
        const email = row[2]?.trim() || null
        const typeRaw = row[3]?.trim().toLowerCase()
        const customerType = validTypes.includes(typeRaw) ? typeRaw : 'retail'
        const labelRaw = row[4]?.trim().toLowerCase()
        const label = labelMap[labelRaw] ?? 'new'
        const registeredSince = row[5]?.trim()
        const validDate = registeredSince && /^\d{4}-\d{2}-\d{2}$/.test(registeredSince)
          ? registeredSince : today

        const { error: insertError } = await supabase.from('customers').insert({
          company_id:       companyId,
          full_name:        fullName,
          phone,
          email,
          customer_type:    customerType,
          label,
          registered_since: validDate,
        })

        if (insertError) {
          errors.push({ row: rowNum, message: insertError.message })
        } else {
          success++
        }
      }
    }

    // ── IMPORTAR PRODUCTOS ───────────────────────────────────
    else if (type === 'products') {
      // Índices: 0=nombre, 1=sku, 2=categoria, 3=precio, 4=costo, 5=stock, 6=minimo, 7=dias
      const categoriesMap: Record<string, string> = {}
      if (categories) {
        categories.forEach((c: { id: string; name: string }) => {
          categoriesMap[c.name.toLowerCase().trim()] = c.id
        })
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        const name = row[0]?.trim()
        if (!name) {
          errors.push({ row: rowNum, message: 'El nombre del producto es obligatorio' })
          continue
        }

        const price = parseFloat(row[3]?.trim() || '')
        if (isNaN(price) || price <= 0) {
          errors.push({ row: rowNum, message: `Precio inválido: "${row[3]}". Debe ser un número mayor a 0` })
          continue
        }

        const sku = row[1]?.trim() || null
        const catName = row[2]?.trim().toLowerCase()
        const categoryId = catName ? categoriesMap[catName] : null
        const cost = parseFloat(row[4]?.trim() || '0') || 0
        const stock = parseInt(row[5]?.trim() || '0') || 0
        const minStock = parseInt(row[6]?.trim() || '0') || 0
        const leadDays = parseInt(row[7]?.trim() || '1') || 1

        const { data: inserted, error: insertError } = await supabase
          .from('products')
          .insert({
            company_id:      companyId,
            name,
            sku,
            category_id:     categoryId || null,
            sale_price:      price,
            unit_cost:       cost,
            current_stock:   stock,
            min_stock_alert: minStock,
            lead_time_days:  leadDays,
            is_active:       true,
          })
          .select('id')
          .single()

        if (insertError) {
          errors.push({ row: rowNum, message: insertError.message })
          continue
        }

        // Si tiene stock inicial, registrar el movimiento
        if (inserted && stock > 0) {
          await supabase.from('inventory_movements').insert({
            company_id:    companyId,
            product_id:    inserted.id,
            type:          'in',
            quantity:      stock,
            reason:        'initial',
            movement_date: today,
            notes:         'Stock importado desde CSV',
          })
        }

        success++
      }
    }

    else {
      return NextResponse.json({ error: 'Tipo de importación inválido' }, { status: 400 })
    }

    return NextResponse.json({
      success,
      errors,
      total: rows.length,
    })

  } catch (error) {
    console.error('Error en importación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

---

## Estructura de carpetas

```
src/app/
├── (dashboard)/
│   └── settings/
│       └── import/
│           └── page.tsx              ← ARCHIVO 1 (reemplaza placeholder)
└── api/
    └── import/
        └── process/
            └── route.ts              ← ARCHIVO 3

src/components/
└── settings/
    └── ImportSection.tsx             ← ARCHIVO 2
```

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODO
2. Variables CSS — SOLO var(--gold), var(--text), etc.
3. Soft delete — las tablas sales, customers y products tienen deleted_at
   Los INSERTs no necesitan deleted_at (es null por defecto)
4. inventory_movements NO tiene deleted_at — no agregarlo
5. Error handling completo — cada fila se procesa independientemente
   Un error en fila 5 no cancela las filas 1-4 que ya se insertaron
6. BOM en el CSV descargado — agregar \uFEFF para compatibilidad con Excel
7. Comentarios en español
8. NO usar librerías de parseo CSV — parsear manualmente
9. Límite de 1,000 filas por importación — validar en el API route
10. Fuentes: font-syne para títulos, font-jakarta para textos
