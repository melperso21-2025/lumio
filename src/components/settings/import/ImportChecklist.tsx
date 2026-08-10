import { createClient } from '@/lib/supabase/server'
import { ENTITY_DEFS, ENTITY_ORDER, type EntityType } from '@/lib/import/entityConfig'

// ── Grupos ────────────────────────────────────────────────────────────────

const GROUPS: { label: string; entities: EntityType[] }[] = [
  {
    label: 'Catálogos base',
    entities: ['suppliers', 'product_categories', 'sales_channels', 'branches', 'customer_types', 'customer_labels', 'bank_accounts'],
  },
  {
    label: 'Datos principales',
    entities: ['products', 'customers'],
  },
  {
    label: 'Transacciones',
    entities: ['sales', 'sale_items', 'bank_transactions', 'ad_campaigns', 'inventory_movements'],
  },
]

// ── Queries ───────────────────────────────────────────────────────────────

async function fetchCounts(companyId: string): Promise<Record<EntityType, number>> {
  const supabase = await createClient()
  const results = await Promise.all(
    ENTITY_ORDER.map(async (key) => {
      const { count } = await supabase
        .from(ENTITY_DEFS[key].table)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null)
      return [key, count ?? 0] as [EntityType, number]
    })
  )
  return Object.fromEntries(results) as Record<EntityType, number>
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toLocaleString()
}

// ── Component ─────────────────────────────────────────────────────────────

export default async function ImportChecklist({ companyId }: { companyId: string }) {
  const counts = await fetchCounts(companyId)
  const uploaded = ENTITY_ORDER.filter((k) => counts[k] > 0).length
  const total = ENTITY_ORDER.length
  const pct = Math.round((uploaded / total) * 100)

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header compacto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="font-syne font-bold" style={{ fontSize: 12, color: 'var(--text)', flexShrink: 0 }}>
          Estado de datos
        </span>
        {/* Barra de progreso */}
        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 99,
              background: pct === 100 ? '#10b981' : 'linear-gradient(90deg,#F5C842,#F09A1A)',
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, fontFamily: 'monospace' }}>
          {uploaded}/{total}
        </span>
      </div>

      {/* 3 columnas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0 16px',
          alignItems: 'start',
        }}
      >
        {GROUPS.map((group) => (
          <div key={group.label}>
            {/* Título de grupo */}
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 5px',
              }}
            >
              {group.label}
            </p>

            {/* Filas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.entities.map((key) => {
                const def = ENTITY_DEFS[key]
                const count = counts[key]
                const done = count > 0
                const missingDeps = def.dependencies.filter((d) => counts[d] === 0)
                const blocked = !done && missingDeps.length > 0

                return (
                  <div
                    key={key}
                    title={
                      blocked
                        ? `Requiere: ${missingDeps.map((d) => ENTITY_DEFS[d].label).join(', ')}`
                        : done
                        ? `${def.label}: ${count.toLocaleString()} registros`
                        : def.label
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 6px',
                      borderRadius: 5,
                      opacity: blocked ? 0.45 : 1,
                    }}
                  >
                    {/* Punto de estado */}
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: done
                          ? '#10b981'
                          : blocked
                          ? 'var(--muted)'
                          : 'var(--border2)',
                        border: done ? 'none' : '1px solid var(--border2)',
                      }}
                    />

                    {/* Nombre */}
                    <span
                      style={{
                        fontSize: 12,
                        color: done ? 'var(--text)' : 'var(--text2)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: done ? 500 : 400,
                      }}
                    >
                      {def.label}
                    </span>

                    {/* Conteo */}
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'monospace',
                        color: done ? '#10b981' : 'var(--border2)',
                        flexShrink: 0,
                      }}
                    >
                      {done ? fmt(count) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
