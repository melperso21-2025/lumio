import { createClient } from '@/lib/supabase/server'
import { ENTITY_DEFS, ENTITY_ORDER, type EntityType } from '@/lib/import/entityConfig'

// ── Grupos visuales ────────────────────────────────────────────────────────

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

// ── Contar registros de cada entidad ───────────────────────────────────────

async function fetchCounts(companyId: string): Promise<Record<EntityType, number>> {
  const supabase = await createClient()

  const results = await Promise.all(
    ENTITY_ORDER.map(async (entityKey) => {
      const table = ENTITY_DEFS[entityKey].table
      const { count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null)
      return [entityKey, count ?? 0] as [EntityType, number]
    })
  )

  return Object.fromEntries(results) as Record<EntityType, number>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

// ── Component ──────────────────────────────────────────────────────────────

export default async function ImportChecklist({ companyId }: { companyId: string }) {
  const counts = await fetchCounts(companyId)

  const totalEntities = ENTITY_ORDER.length
  const uploadedEntities = ENTITY_ORDER.filter((k) => counts[k] > 0).length
  const pct = Math.round((uploadedEntities / totalEntities) * 100)

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header + barra de progreso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 className="font-syne font-bold" style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 2px' }}>
            Estado de datos
          </h2>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
            {uploadedEntities} de {totalEntities} entidades con datos cargados
          </p>
        </div>
        <span
          className="font-syne font-bold"
          style={{
            fontSize: 20,
            color: pct === 100 ? '#10b981' : pct >= 50 ? 'var(--gold)' : 'var(--muted)',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {pct}%
        </span>
      </div>

      {/* Barra */}
      <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 99,
            background:
              pct === 100
                ? '#10b981'
                : pct >= 50
                ? 'linear-gradient(90deg, #F5C842, #F09A1A)'
                : 'var(--gold)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Grupos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p
              className="font-syne font-bold"
              style={{
                fontSize: 9,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 6px',
              }}
            >
              {group.label}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {group.entities.map((entityKey) => {
                const def = ENTITY_DEFS[entityKey]
                const count = counts[entityKey]
                const done = count > 0

                // dependencias aún sin datos
                const missingDeps = def.dependencies.filter((d) => counts[d] === 0)
                const blocked = !done && missingDeps.length > 0

                return (
                  <div
                    key={entityKey}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '16px 1fr auto',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 7,
                      background: done
                        ? 'rgba(16,185,129,0.06)'
                        : blocked
                        ? 'transparent'
                        : 'transparent',
                      border: done
                        ? '1px solid rgba(16,185,129,0.2)'
                        : '1px solid var(--border)',
                      opacity: blocked ? 0.5 : 1,
                    }}
                  >
                    {/* Icono */}
                    <span style={{ fontSize: 12, lineHeight: 1, textAlign: 'center', flexShrink: 0 }}>
                      {done ? '✓' : blocked ? '⊘' : '○'}
                    </span>

                    {/* Nombre + aviso de dependencias */}
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 12,
                          color: done ? '#10b981' : 'var(--text)',
                          fontWeight: done ? 600 : 400,
                        }}
                      >
                        {def.label}
                      </span>
                      {blocked && (
                        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>
                          · requiere: {missingDeps.map((d) => ENTITY_DEFS[d].label).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Conteo */}
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: done ? '#10b981' : 'var(--muted)',
                        flexShrink: 0,
                      }}
                    >
                      {done ? fmtCount(count) : '—'}
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
