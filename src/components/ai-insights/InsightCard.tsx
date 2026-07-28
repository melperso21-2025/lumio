// InsightCard — card compacta para el historial lateral
// Sin 'use client' — componente puro

interface InsightCardProps {
  weekNumber: number
  year: number
  summary: string | null
  createdAt: string | null
  viewedAt: string | null
  isCurrent: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default function InsightCard({
  weekNumber,
  year,
  summary,
  createdAt,
  viewedAt,
  isCurrent,
}: InsightCardProps) {
  const truncatedSummary = summary
    ? summary.length > 80
      ? `${summary.slice(0, 80)}...`
      : summary
    : '—'

  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--bg)',
        border: `1px solid ${isCurrent ? 'var(--gold-bdr)' : 'var(--border)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span
          className="font-syne font-bold"
          style={{ fontSize: 13, color: 'var(--text)' }}
        >
          Semana {weekNumber}
        </span>
        {isCurrent && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--gold-bg)',
              color: 'var(--gold)',
            }}
          >
            Esta semana
          </span>
        )}
        {!isCurrent && viewedAt && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(5,150,105,0.1)',
              color: 'var(--green)',
            }}
          >
            Visto
          </span>
        )}
        {!isCurrent && !viewedAt && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--gold-bg)',
              color: 'var(--gold)',
            }}
          >
            Nuevo
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: 11,
          color: 'var(--text2)',
          lineHeight: 1.5,
          margin: '0 0 6px 0',
        }}
      >
        {truncatedSummary}
      </p>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>
        {formatDate(createdAt)}
      </span>
    </div>
  )
}
