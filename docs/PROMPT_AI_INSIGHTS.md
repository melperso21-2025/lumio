# PROMPT — Módulo IA Insights

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Sigue el patrón de src/app/(dashboard)/profit-loss/page.tsx para Server Components
- Sigue el patrón de src/components/finance/NewTransactionForm.tsx para Client Components
- El modelo de IA a usar es: claude-sonnet-4-5 (Anthropic)
- La API key está en process.env.ANTHROPIC_API_KEY

## Tarea
Crea TRES archivos NUEVOS. NO modifiques ningún archivo existente.

---

## ARCHIVO 1: src/app/(dashboard)/ai-insights/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports requeridos
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
import KpiCard from '@/components/ui/KpiCard'
import GenerateInsightButton from '@/components/ai-insights/GenerateInsightButton'
import InsightCard from '@/components/ai-insights/InsightCard'
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
const canGenerate = userRole === 'admin' || isPulseAdmin

// Si no hay companyId → mensaje igual que otros módulos

// 2. Semana y año actual
const now = new Date()
const currentYear = now.getFullYear()
// Calcular número de semana ISO
const startOfYear = new Date(currentYear, 0, 1)
const weekNumber = Math.ceil(
  ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
)

// 3. Insight de la semana actual
const { data: currentInsight } = await supabase
  .from('ai_insights')
  .select('id, week_number, year, insight_sales, insight_campaigns, insight_inventory, insight_finance, playbook, executive_summary, viewed_at, created_at')
  .eq('company_id', companyId)
  .eq('week_number', weekNumber)
  .eq('year', currentYear)
  .single()

// 4. Historial de últimos 8 insights
const { data: insightHistory } = await supabase
  .from('ai_insights')
  .select('id, week_number, year, executive_summary, created_at, viewed_at')
  .eq('company_id', companyId)
  .order('year', { ascending: false })
  .order('week_number', { ascending: false })
  .limit(8)

const history = insightHistory ?? []

// 5. Marcar como visto si no lo estaba
if (currentInsight && !currentInsight.viewed_at) {
  await supabase
    .from('ai_insights')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', currentInsight.id)
}

// 6. Verificar si hay datos suficientes para generar
const { count: salesCount } = await supabase
  .from('sales')
  .select('id', { count: 'exact', head: true })
  .eq('company_id', companyId)
  .is('deleted_at', null)

const hasEnoughData = (salesCount ?? 0) >= 1
```

### JSX — estructura exacta

**Sección 1 — Topbar:**
```tsx
<Topbar
  pageTitle="IA Insights"
  pageSubtitle={`Análisis semanal · Semana ${weekNumber} · ${currentYear}`}
/>
```

**Sección 2 — Layout principal (grid 3-1):**
```
display: grid
gridTemplateColumns: '1fr 280px'
gap: 20
padding: 20
```

**Columna izquierda — Insight actual:**

Si `currentInsight` existe:
```tsx
// Mostrar el insight de esta semana
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

  {/* Header del insight */}
  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <h2 className="font-syne font-bold" style={{ fontSize: 18, color: 'var(--text)' }}>
          Análisis · Semana {currentInsight.week_number}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Generado el {formatDate(currentInsight.created_at)}
        </p>
      </div>
      {canGenerate && (
        <GenerateInsightButton
          companyId={companyId}
          weekNumber={weekNumber}
          year={currentYear}
          hasExisting={true}
          hasEnoughData={hasEnoughData}
          label="↻ Regenerar"
          variant="ghost"
        />
      )}
    </div>

    {/* Resumen ejecutivo */}
    {currentInsight.executive_summary && (
      <AiInsightBox
        variant="gold"
        title="✦ Resumen ejecutivo"
        text={currentInsight.executive_summary}
      />
    )}
  </div>

  {/* 4 módulos de análisis */}
  {currentInsight.insight_sales && (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h3 className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
        💰 Análisis de Ventas
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
        {currentInsight.insight_sales}
      </p>
    </div>
  )}

  {currentInsight.insight_campaigns && (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h3 className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
        📣 Análisis de Pautas
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
        {currentInsight.insight_campaigns}
      </p>
    </div>
  )}

  {currentInsight.insight_inventory && (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h3 className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
        📦 Análisis de Inventario
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
        {currentInsight.insight_inventory}
      </p>
    </div>
  )}

  {currentInsight.insight_finance && (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h3 className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
        🏦 Análisis Financiero
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
        {currentInsight.insight_finance}
      </p>
    </div>
  )}

  {/* Playbook de acciones */}
  {currentInsight.playbook && Array.isArray(currentInsight.playbook) && currentInsight.playbook.length > 0 && (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <h3 className="font-syne font-bold" style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
        ✦ Playbook — Acciones priorizadas
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(currentInsight.playbook as PlaybookItem[]).map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '10px 14px',
            background: 'var(--bg)', borderRadius: 8,
            border: `1px solid ${
              item.priority === 'urgent' ? 'rgba(220,38,38,0.2)' :
              item.priority === 'soon' ? 'rgba(217,119,6,0.2)' :
              'rgba(232,165,0,0.15)'
            }`
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px',
              borderRadius: 4, height: 'fit-content', flexShrink: 0,
              background: item.priority === 'urgent' ? 'rgba(220,38,38,0.1)' :
                          item.priority === 'soon'   ? 'rgba(217,119,6,0.1)' :
                          'rgba(232,165,0,0.1)',
              color: item.priority === 'urgent' ? 'var(--red)' :
                     item.priority === 'soon'   ? 'var(--orange)' :
                     'var(--gold)',
            }}>
              {item.priority === 'urgent' ? 'HOY' :
               item.priority === 'soon'   ? 'SEMANA' : 'MES'}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                {item.action}
              </div>
              {item.reason && (
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {item.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

Si `currentInsight` NO existe:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
  <div style={{
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 40, textAlign: 'center'
  }}>
    <div style={{ fontSize: 32, marginBottom: 16 }}>✦</div>
    <h2 className="font-syne font-bold" style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
      Sin análisis esta semana
    </h2>
    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
      {hasEnoughData
        ? `Genera el análisis de la semana ${weekNumber} para ver insights personalizados de tu negocio.`
        : 'Registra al menos una venta para poder generar tu primer análisis de IA.'
      }
    </p>
    {canGenerate && hasEnoughData && (
      <GenerateInsightButton
        companyId={companyId}
        weekNumber={weekNumber}
        year={currentYear}
        hasExisting={false}
        hasEnoughData={hasEnoughData}
        label="✦ Generar análisis de esta semana"
        variant="primary"
      />
    )}
    {!hasEnoughData && (
      <AiInsightBox
        variant="blue"
        title="Datos insuficientes"
        text="Registra ventas, pautas y movimientos bancarios para que la IA pueda analizar tu negocio con precisión."
      />
    )}
  </div>
</div>
```

**Columna derecha — Historial y stats:**
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

  {/* Stats rápidos */}
  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <h3 className="font-syne font-bold" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
      Esta semana
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text2)' }}>Semana actual</span>
        <span className="font-syne font-bold" style={{ color: 'var(--gold)' }}>#{weekNumber}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text2)' }}>Análisis generados</span>
        <span className="font-syne font-bold" style={{ color: 'var(--text)' }}>{history.length}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text2)' }}>Estado semana</span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
          background: currentInsight ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
          color: currentInsight ? 'var(--green)' : 'var(--orange)'
        }}>
          {currentInsight ? '✓ Generado' : 'Pendiente'}
        </span>
      </div>
    </div>
  </div>

  {/* Historial */}
  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <h3 className="font-syne font-bold" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
      Historial
    </h3>
    {history.length === 0 ? (
      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
        Sin análisis previos
      </p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {history.map((h) => (
          <InsightCard
            key={h.id}
            weekNumber={h.week_number}
            year={h.year}
            summary={h.executive_summary}
            createdAt={h.created_at}
            viewedAt={h.viewed_at}
            isCurrent={h.week_number === weekNumber && h.year === currentYear}
          />
        ))}
      </div>
    )}
  </div>
</div>
```

### Tipos necesarios en el archivo
```typescript
interface PlaybookItem {
  action: string
  reason?: string
  priority: 'urgent' | 'soon' | 'later'
  timeframe?: string
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  } catch { return '—' }
}
```

---

## ARCHIVO 2: src/components/ai-insights/GenerateInsightButton.tsx

### Tipo
'use client'

### Props
```typescript
interface GenerateInsightButtonProps {
  companyId: string
  weekNumber: number
  year: number
  hasExisting: boolean
  hasEnoughData: boolean
  label: string
  variant: 'primary' | 'ghost'
}
```

### Estado
```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState(false)
```

### handleGenerate
```typescript
async function handleGenerate() {
  setLoading(true)
  setError(null)

  try {
    const response = await fetch('/api/ai-insights/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, weekNumber, year }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error ?? 'Error al generar el análisis')
      setLoading(false)
      return
    }

    setSuccess(true)
    // Refrescar la página para mostrar el nuevo insight
    setTimeout(() => {
      window.location.reload()
    }, 1000)

  } catch {
    setError('Error de conexión. Intenta de nuevo.')
    setLoading(false)
  }
}
```

### JSX
```tsx
<div>
  {error && (
    <div style={{
      background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
      borderRadius: 8, padding: '8px 12px', marginBottom: 12,
      fontSize: 12, color: 'var(--red)'
    }}>
      {error}
    </div>
  )}

  {success && (
    <div style={{
      background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)',
      borderRadius: 8, padding: '8px 12px', marginBottom: 12,
      fontSize: 12, color: 'var(--green)', fontWeight: 500
    }}>
      ✓ Análisis generado — cargando...
    </div>
  )}

  <button
    type="button"
    onClick={handleGenerate}
    disabled={loading || success}
    className="font-syne font-bold"
    style={variant === 'primary' ? {
      background: loading ? 'rgba(232,165,0,0.5)' : 'linear-gradient(135deg, #F5C842, #F09A1A)',
      color: '#1A1B2E',
      padding: '10px 24px',
      borderRadius: 8,
      fontSize: 14,
      border: 'none',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1,
    } : {
      background: 'transparent',
      color: 'var(--gold)',
      padding: '6px 12px',
      borderRadius: 6,
      fontSize: 12,
      border: '1px solid var(--gold-bdr)',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.6 : 1,
    }}
  >
    {loading ? '✦ Analizando...' : success ? '✓ Listo' : label}
  </button>
</div>
```

---

## ARCHIVO 3: src/app/api/ai-insights/generate/route.ts

### Tipo
API Route — Next.js App Router

### Descripción
Este es el endpoint que llama a Claude API. Verifica que no exista insight de la semana, recopila datos de la empresa, construye el prompt y guarda el resultado en Supabase.

### Imports
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
```

### Lógica completa
```typescript
export async function POST(request: NextRequest) {
  try {
    const { companyId, weekNumber, year } = await request.json()

    if (!companyId || !weekNumber || !year) {
      return NextResponse.json({ error: 'Parámetros incompletos' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Verificar permisos — solo admin o pulse_admin
    const { data: userData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (userData?.company_id !== companyId && !userData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    if (userData?.role !== 'admin' && !userData?.is_pulse_admin) {
      return NextResponse.json({ error: 'Solo administradores pueden generar análisis' }, { status: 403 })
    }

    // 3. CONTROL DE USO: verificar si ya existe insight esta semana
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id, created_at')
      .eq('company_id', companyId)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .single()

    // Si existe y fue generado hace menos de 1 hora, no regenerar
    if (existing) {
      const generatedAt = new Date(existing.created_at).getTime()
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      if (generatedAt > oneHourAgo) {
        return NextResponse.json({
          error: 'Ya existe un análisis reciente para esta semana. Espera al menos 1 hora para regenerar.'
        }, { status: 429 })
      }
    }

    // 4. Recopilar datos de la empresa para el análisis
    const monthStart = new Date(year, 0, 1)
    const weekStart = new Date(monthStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const weekEndStr = weekEnd.toISOString().slice(0, 10)

    // Datos de ventas de la semana
    const { data: salesData } = await supabase
      .from('sales')
      .select('gross_total, production_cost, discount_amount, lines_per_order, status, channel_id')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('sale_date', weekStartStr)
      .lt('sale_date', weekEndStr)

    // Datos de pautas de la semana
    const { data: adsData } = await supabase
      .from('ad_campaigns')
      .select('spend, attributed_revenue, roas, ctr, effectiveness_rate, leads_count, platform')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('week_number', weekNumber)

    // Datos de inventario — productos con stock bajo
    const { data: inventoryData } = await supabase
      .from('products')
      .select('name, current_stock, min_stock_alert, sale_price, unit_cost')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)

    // Datos financieros — saldo y transacciones recientes
    const { data: bankData } = await supabase
      .from('bank_accounts')
      .select('current_balance, bank_name')
      .eq('company_id', companyId)
      .is('deleted_at', null)

    const { data: txData } = await supabase
      .from('bank_transactions')
      .select('type, amount, category, is_fixed')
      .eq('company_id', companyId)
      .gte('tx_date', weekStartStr)
      .lt('tx_date', weekEndStr)

    // 5. Preparar resumen de datos para el prompt
    const sales = salesData ?? []
    const ads = adsData ?? []
    const products = inventoryData ?? []
    const banks = bankData ?? []
    const transactions = txData ?? []

    const totalSales = sales.reduce((s, r) => s + (r.gross_total ?? 0), 0)
    const totalTransactions = sales.length
    const avgLPP = totalTransactions > 0
      ? sales.reduce((s, r) => s + (r.lines_per_order ?? 0), 0) / totalTransactions : 0
    const totalAdSpend = ads.reduce((s, a) => s + (a.spend ?? 0), 0)
    const avgROAS = ads.length > 0
      ? ads.reduce((s, a) => s + (a.roas ?? 0), 0) / ads.length : 0
    const totalBalance = banks.reduce((s, b) => s + (b.current_balance ?? 0), 0)
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0)
    const lowStockProducts = products.filter(p =>
      (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0) && (p.min_stock_alert ?? 0) > 0
    )

    // 6. Construir prompt para Claude
    const prompt = `Eres el motor de análisis de Lumio, una plataforma de inteligencia de negocio para PyMEs latinoamericanas.

Analiza los siguientes datos de la semana ${weekNumber} del año ${year} y genera un informe ejecutivo en español para el dueño del negocio.

## DATOS DE LA SEMANA

### Ventas
- Total ventas: $${totalSales.toFixed(2)}
- Número de transacciones: ${totalTransactions}
- Promedio líneas por pedido (LPP): ${avgLPP.toFixed(1)}
- Total descuentos: $${sales.reduce((s, r) => s + (r.discount_amount ?? 0), 0).toFixed(2)}

### Pautas Publicitarias
- Inversión total: $${totalAdSpend.toFixed(2)}
- ROAS promedio: ${avgROAS.toFixed(2)}
- Leads generados: ${ads.reduce((s, a) => s + (a.leads_count ?? 0), 0)}
- Plataformas activas: ${[...new Set(ads.map(a => a.platform))].join(', ') || 'ninguna'}

### Inventario
- Total productos activos: ${products.length}
- Productos con stock bajo: ${lowStockProducts.length}
${lowStockProducts.length > 0 ? `- Productos críticos: ${lowStockProducts.slice(0, 3).map(p => p.name).join(', ')}` : ''}

### Finanzas
- Saldo total en cuentas: $${totalBalance.toFixed(2)}
- Egresos de la semana: $${totalExpenses.toFixed(2)}
- Días de caja estimados: ${totalExpenses > 0 ? Math.floor(totalBalance / (totalExpenses / 7)) : 'N/A'}

## INSTRUCCIONES

Genera el análisis en formato JSON con exactamente esta estructura. NO incluyas texto fuera del JSON:

{
  "executive_summary": "Párrafo de 3-4 oraciones con los hallazgos más importantes de la semana. Sé específico con los números. Tono directo y ejecutivo.",
  "insight_sales": "Análisis de 2-3 párrafos sobre el desempeño de ventas. Incluye observaciones sobre transacciones, LPP y descuentos.",
  "insight_campaigns": "Análisis de 2-3 párrafos sobre pautas publicitarias. Evalúa ROAS, eficiencia de inversión y recomendaciones.",
  "insight_inventory": "Análisis de 1-2 párrafos sobre el estado del inventario. Menciona productos críticos si los hay.",
  "insight_finance": "Análisis de 1-2 párrafos sobre la situación financiera. Evalúa días de caja y flujo.",
  "playbook": [
    {
      "action": "Acción específica y concreta que debe tomar el dueño del negocio",
      "reason": "Por qué esta acción es importante basándose en los datos",
      "priority": "urgent",
      "timeframe": "hoy"
    }
  ]
}

El playbook debe tener entre 3 y 5 acciones priorizadas:
- priority "urgent" + timeframe "hoy": máximo 1 acción crítica
- priority "soon" + timeframe "esta semana": 1-2 acciones importantes
- priority "later" + timeframe "este mes": 1-2 acciones estratégicas

Si no hay datos suficientes en algún módulo, indícalo claramente en el análisis correspondiente y da recomendaciones generales.

Responde ÚNICAMENTE con el JSON válido, sin markdown, sin explicaciones adicionales.`

    // 7. Llamar a Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text : ''

    // 8. Parsear respuesta JSON de Claude
    let analysisData: {
      executive_summary: string
      insight_sales: string
      insight_campaigns: string
      insight_inventory: string
      insight_finance: string
      playbook: Array<{ action: string; reason: string; priority: string; timeframe: string }>
    }

    try {
      // Limpiar posibles backticks de markdown
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysisData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({
        error: 'Error procesando la respuesta de IA. Intenta de nuevo.'
      }, { status: 500 })
    }

    // 9. Guardar en Supabase (upsert — actualiza si ya existe)
    const { error: upsertError } = await supabase
      .from('ai_insights')
      .upsert({
        company_id:          companyId,
        week_number:         weekNumber,
        year:                year,
        executive_summary:   analysisData.executive_summary,
        insight_sales:       analysisData.insight_sales,
        insight_campaigns:   analysisData.insight_campaigns,
        insight_inventory:   analysisData.insight_inventory,
        insight_finance:     analysisData.insight_finance,
        playbook:            analysisData.playbook,
        viewed_at:           null,
      }, {
        onConflict: 'company_id,week_number,year'
      })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Análisis generado correctamente' })

  } catch (error) {
    console.error('Error generando insight:', error)
    return NextResponse.json({
      error: 'Error interno del servidor. Intenta de nuevo.'
    }, { status: 500 })
  }
}
```

---

## ARCHIVO 4 (adicional): src/components/ai-insights/InsightCard.tsx

### Tipo
Componente simple sin 'use client' (no usa hooks)

### Props
```typescript
interface InsightCardProps {
  weekNumber: number
  year: number
  summary: string | null
  createdAt: string | null
  viewedAt: string | null
  isCurrent: boolean
}
```

### JSX
```tsx
// Card compacta para el historial lateral
// Si isCurrent: borde dorado y badge "Esta semana"
// Si viewedAt: badge "Visto" verde
// Si !viewedAt: badge "Nuevo" dorado
// Mostrar: "Semana {weekNumber}" en font-syne bold
// Mostrar: primeras 80 chars del summary + "..."
// Mostrar: fecha de creación en muted 10px
// Sin interactividad por ahora (la navegación entre semanas es Fase 2)
```

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODO
2. Variables CSS — SOLO var(--gold), var(--text), etc.
3. Comentarios en español
4. NO usar librerías externas de UI
5. El API route usa SIEMPRE createClient() del server para verificar auth
6. NUNCA exponer ANTHROPIC_API_KEY al frontend — solo en API routes
7. Control de uso: verificar existencia antes de llamar a Claude
8. Manejar gracefully: sin datos → mostrar mensaje claro, no errores
9. El JSON de Claude puede tener backticks de markdown — limpiar antes de parsear
10. Fuentes: font-syne para títulos y valores, font-jakarta para textos largos
