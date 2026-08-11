'use client'

import { useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface PGMetrics {
  gross_revenue: number
  total_discounts: number
  net_revenue: number
  cost_of_goods: number
  gross_profit: number
  gross_margin_pct: number
  fixed_expenses: number
  variable_expenses: number
  operating_expenses: number
  ad_spend: number
  ad_revenue: number
  avg_roas: number
  total_expenses_all: number
  ebitda: number
  net_margin_pct: number
  contribution_margin_pct: number
}

export interface MonthlyPoint {
  key: string
  label: string
  netResult: number
  roas: number | null
}

export interface CampaignRow {
  id: string
  campaign_name: string | null
  platform: string | null
  spend: number | null
  attributed_revenue: number | null
  roas: number | null
}

interface Props {
  cur: PGMetrics
  prev: PGMetrics | null
  from: string
  to: string
  monthlyData: MonthlyPoint[]
  campaigns: CampaignRow[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt  = (n: number) => '$' + Math.round(Math.abs(n)).toLocaleString('es-EC')

function calcDelta(a: number, b: number): number | null {
  if (b === 0) return null
  return Math.round(((a - b) / Math.abs(b)) * 100)
}

function css(v: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim()
}

const PLATFORM_COLORS: Record<string, { bg: string; color: string }> = {
  meta:     { bg: 'rgba(24,119,242,0.12)',  color: '#4a90e2' },
  facebook: { bg: 'rgba(24,119,242,0.12)',  color: '#4a90e2' },
  google:   { bg: 'rgba(234,67,53,0.12)',   color: '#e05c4b' },
  tiktok:   { bg: 'rgba(0,0,0,0.08)',       color: '#9496B8' },
  instagram:{ bg: 'rgba(193,53,132,0.12)',  color: '#c13584' },
}

function platformChip(p: string | null) {
  const key = (p ?? '').toLowerCase()
  const cfg = PLATFORM_COLORS[key] ?? { bg: 'var(--surface)', color: 'var(--muted)' }
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
      background: cfg.bg, color: cfg.color, textTransform: 'capitalize',
      display: 'inline-block',
    }}>
      {p ?? '—'}
    </span>
  )
}

// ── Canvas charts ──────────────────────────────────────────────────────────

function drawNetResultChart(canvas: HTMLCanvasElement, data: MonthlyPoint[]) {
  const dpr = window.devicePixelRatio || 1
  const container = canvas.parentElement
  const W = container ? Math.max(container.clientWidth - 2, 100) : 300
  const H = 170
  canvas.width  = W * dpr
  canvas.height = H * dpr
  canvas.style.width  = W + 'px'
  canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  const green = css('--green') || '#34d399'
  const red   = css('--red')   || '#f87171'
  const gold  = css('--gold')  || '#F5C842'
  const muted = css('--muted') || '#888'
  const border = css('--border2') || '#e5e7eb'

  const pL = 48, pR = 12, pT = 24, pB = 28
  const cW = W - pL - pR
  const cH = H - pT - pB
  const maxA = Math.max(...data.map(d => Math.abs(d.netResult)), 1) * 1.25
  const zeroY = pT + cH / 2
  const slot = cW / data.length
  const bW = Math.min(slot * 0.55, 34)

  // Grid horizontal
  ;[-1, -0.5, 0, 0.5, 1].forEach(t => {
    const y = pT + cH * (0.5 - t * 0.5)
    ctx.strokeStyle = border
    ctx.lineWidth   = t === 0 ? 1.5 : 0.6
    ctx.setLineDash(t === 0 ? [] : [3, 3])
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke()
    ctx.setLineDash([])
    if (t !== 0) {
      const v = maxA * t
      const lbl = Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(Math.abs(v)))
      ctx.fillStyle   = muted
      ctx.font        = '9px system-ui'
      ctx.textAlign   = 'right'
      ctx.fillText((t > 0 ? '+' : '−') + '$' + lbl, pL - 4, y + 3)
    }
  })

  const tpts: { x: number; y: number }[] = []

  data.forEach((d, i) => {
    const v  = d.netResult
    const cx = pL + slot * i + slot * 0.5
    const bH = Math.max(Math.abs(v) / maxA * (cH / 2), 3)
    const pos = v >= 0

    const gr = ctx.createLinearGradient(0, pos ? zeroY - bH : zeroY, 0, pos ? zeroY : zeroY + bH)
    if (pos) { gr.addColorStop(0, green); gr.addColorStop(1, green + '44') }
    else      { gr.addColorStop(0, red + '44'); gr.addColorStop(1, red) }

    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.roundRect(cx - bW / 2, pos ? zeroY - bH : zeroY, bW, bH, 3)
    ctx.fill()

    const absK = Math.abs(v) >= 1000
      ? (Math.abs(v) / 1000).toFixed(1) + 'k'
      : String(Math.abs(Math.round(v)))
    ctx.fillStyle = pos ? green : red
    ctx.font      = 'bold 9px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText((pos ? '+' : '−') + '$' + absK, cx, pos ? zeroY - bH - 5 : zeroY + bH + 11)

    ctx.fillStyle = muted
    ctx.font      = '9px system-ui'
    ctx.fillText(d.label, cx, H - 5)

    tpts.push({ x: cx, y: zeroY - (v / maxA) * (cH / 2) })
  })

  // Trend line
  ctx.strokeStyle = gold + 'BB'
  ctx.lineWidth   = 1.5
  ctx.setLineDash([4, 3])
  ctx.lineJoin    = 'round'
  ctx.beginPath()
  tpts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()
  ctx.setLineDash([])

  tpts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = gold; ctx.fill()
  })
}

function drawROASChart(canvas: HTMLCanvasElement, data: MonthlyPoint[]) {
  const dpr = window.devicePixelRatio || 1
  const container = canvas.parentElement
  const W = container ? Math.max(container.clientWidth - 2, 100) : 300
  const H = 140
  canvas.width  = W * dpr
  canvas.height = H * dpr
  canvas.style.width  = W + 'px'
  canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  const green  = css('--green')  || '#34d399'
  const red    = css('--red')    || '#f87171'
  const gold   = css('--gold')   || '#F5C842'
  const muted  = css('--muted')  || '#888'
  const orange = css('--orange') || '#fb923c'
  const cardBg = css('--card')   || '#ffffff'
  const border = css('--border2') || '#e5e7eb'

  const bench = 3, maxR = 5
  const pL = 12, pR = 44, pT = 24, pB = 24
  const cW = W - pL - pR
  const cH = H - pT - pB
  const count = data.length
  const gap   = count > 1 ? cW / (count - 1) : cW

  ;[0, 1, 2, 3, 4, 5].forEach(v => {
    const y = pT + cH * (1 - v / maxR)
    ctx.strokeStyle = border; ctx.lineWidth = 0.6; ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = muted; ctx.font = '9px system-ui'; ctx.textAlign = 'left'
    ctx.fillText(v + 'x', pL + cW + 6, y + 3)
  })

  const benchY = pT + cH * (1 - bench / maxR)
  const zg = ctx.createLinearGradient(0, pT, 0, benchY)
  zg.addColorStop(0, green + '14'); zg.addColorStop(1, green + '04')
  ctx.fillStyle = zg; ctx.fillRect(pL, pT, cW, benchY - pT)

  ctx.strokeStyle = gold + '88'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3])
  ctx.beginPath(); ctx.moveTo(pL, benchY); ctx.lineTo(pL + cW, benchY); ctx.stroke()
  ctx.setLineDash([])

  const pts = data.map((d, i) => ({
    x: count > 1 ? pL + gap * i : pL + cW / 2,
    y: d.roas !== null ? pT + cH * (1 - Math.min(d.roas, maxR) / maxR) : null,
    r: d.roas,
    label: d.label,
  }))

  const valid = pts.filter(p => p.y !== null)

  if (valid.length > 0) {
    const ag = ctx.createLinearGradient(0, pT, 0, pT + cH)
    ag.addColorStop(0, orange + '44'); ag.addColorStop(1, orange + '06')
    ctx.beginPath()
    let first = true
    valid.forEach(p => {
      if (first) { ctx.moveTo(p.x, pT + cH); ctx.lineTo(p.x, p.y!); first = false }
      else ctx.lineTo(p.x, p.y!)
    })
    ctx.lineTo(valid[valid.length - 1].x, pT + cH)
    ctx.closePath(); ctx.fillStyle = ag; ctx.fill()

    ctx.strokeStyle = orange; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    ctx.beginPath(); first = true
    valid.forEach(p => { first ? ctx.moveTo(p.x, p.y!) : ctx.lineTo(p.x, p.y!); first = false })
    ctx.stroke()

    valid.forEach(p => {
      const good = (p.r ?? 0) >= bench
      ctx.beginPath(); ctx.arc(p.x, p.y!, 6, 0, Math.PI * 2)
      ctx.fillStyle = (good ? green : red) + '22'; ctx.fill()
      ctx.beginPath(); ctx.arc(p.x, p.y!, 4, 0, Math.PI * 2)
      ctx.fillStyle = good ? green : red; ctx.fill()
      ctx.strokeStyle = cardBg; ctx.lineWidth = 1.5; ctx.stroke()

      ctx.fillStyle = good ? green : red
      ctx.font      = 'bold 9px system-ui'; ctx.textAlign = 'center'
      ctx.fillText((p.r ?? 0).toFixed(2) + 'x', p.x, p.y! - 10)
    })
  } else {
    ctx.fillStyle = muted; ctx.font = '11px system-ui'; ctx.textAlign = 'center'
    ctx.fillText('Sin datos de publicidad', W / 2, H / 2)
  }

  pts.forEach(p => {
    ctx.fillStyle = muted; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
    ctx.fillText(p.label, p.x, H - 5)
  })
}

// ── Waterfall step ─────────────────────────────────────────────────────────

interface StepProps {
  icon: string
  label: string
  sublabel?: string
  amount: string
  amountColor?: string
  prevLabel?: string
  delta?: number | null
  isSubtotal?: boolean
  isFinal?: boolean
  children?: React.ReactNode
}

function WFStep({ icon, label, sublabel, amount, amountColor, prevLabel, delta, isSubtotal, isFinal, children }: StepProps) {
  const showDelta = delta !== null && delta !== undefined
  const isPos    = (delta ?? 0) > 0
  const deltaColor = showDelta
    ? delta === 0 ? 'var(--muted)' : isPos ? 'var(--green)' : 'var(--red)'
    : 'var(--muted)'

  const rowBg = isFinal ? 'rgba(52,211,153,0.05)' : isSubtotal ? 'rgba(245,200,66,0.05)' : 'transparent'

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: isFinal ? '12px 16px' : isSubtotal ? '9px 16px' : '8px 16px',
        borderBottom: '1px solid var(--border)',
        background: rowBg,
      }}>
        {/* Icono */}
        <span style={{ fontSize: isFinal ? 16 : 13, flexShrink: 0, width: 22, textAlign: 'center' }}>
          {icon}
        </span>

        {/* Texto */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: isFinal ? 13 : isSubtotal ? 12 : 11,
            fontWeight: isFinal ? 700 : isSubtotal ? 600 : 400,
            color: isFinal || isSubtotal ? 'var(--text)' : 'var(--text2)',
            fontFamily: isFinal ? 'var(--font-syne)' : undefined,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>{sublabel}</div>
          )}
          {showDelta && (
            <span style={{
              display: 'inline-flex', fontSize: 9, fontWeight: 700,
              padding: '1px 5px', borderRadius: 3, marginTop: 3,
              background: isPos ? 'rgba(52,211,153,0.1)' : delta === 0 ? 'var(--surface)' : 'rgba(248,113,113,0.1)',
              color: deltaColor,
            }}>
              {isPos ? '↑' : '↓'} {Math.abs(delta ?? 0)}% vs ant.
            </span>
          )}
        </div>

        {/* Montos */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: isFinal ? 800 : isSubtotal ? 700 : 600,
            fontSize: isFinal ? 20 : isSubtotal ? 14 : 13,
            color: amountColor ?? (isFinal ? 'var(--green)' : isSubtotal ? 'var(--gold)' : 'var(--text)'),
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}>
            {amount}
          </div>
          {prevLabel && (
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap' }}>
              {prevLabel}
            </div>
          )}
        </div>
      </div>
      {children}
    </>
  )
}

function SubRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 16px 5px 50px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: valueColor ?? 'var(--text2)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

// ── Divider subtotal ───────────────────────────────────────────────────────

function WFDivider() {
  return <div style={{ height: 1, background: 'var(--border2)', margin: '0 16px' }} />
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProfitLossView({ cur, prev, monthlyData, campaigns }: Props) {
  const netRef  = useRef<HTMLCanvasElement>(null)
  const roasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    function draw() {
      if (netRef.current)  drawNetResultChart(netRef.current,  monthlyData)
      if (roasRef.current) drawROASChart(roasRef.current, monthlyData)
    }
    draw()

    const ro = new ResizeObserver(draw)
    if (netRef.current?.parentElement)  ro.observe(netRef.current.parentElement)
    if (roasRef.current?.parentElement) ro.observe(roasRef.current.parentElement)

    const mo = new MutationObserver(draw)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => { ro.disconnect(); mo.disconnect() }
  }, [monthlyData])

  const isPositive = cur.ebitda >= 0
  const netDelta   = prev ? calcDelta(cur.ebitda, prev.ebitda) : null

  const totalAdSpend   = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
  const totalAdRevenue = campaigns.reduce((s, c) => s + (c.attributed_revenue ?? 0), 0)
  const totalRoas      = totalAdSpend > 0 ? totalAdRevenue / totalAdSpend : null
  const hasAds         = campaigns.length > 0

  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 0,
  }

  const cardHeader: React.CSSProperties = {
    padding: '12px 16px 10px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  }

  const cardTitle: React.CSSProperties = {
    fontFamily: 'var(--font-syne)',
    fontWeight: 700,
    fontSize: 12,
    color: 'var(--text)',
  }

  const cardSub: React.CSSProperties = {
    fontSize: 10,
    color: 'var(--muted)',
    marginTop: 2,
  }

  return (
    <div style={{
      padding: '14px 16px',
      overflowY: 'auto',
      overflowX: 'hidden',
      height: 'calc(100vh - 52px)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>

      {/* ── Hero strip ── */}
      <div style={{
        ...card,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 20px',
        flexWrap: 'wrap',
        flexShrink: 0,
        borderColor: isPositive ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)',
      }}>
        {/* Resultado grande */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.1em', color: isPositive ? 'var(--green)' : 'var(--red)',
            marginBottom: 4,
          }}>
            {isPositive ? '✓ Resultado positivo' : '⚠ Resultado negativo'}
          </div>
          <div style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 36,
            color: isPositive ? 'var(--green)' : 'var(--red)',
            lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(cur.ebitda)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, maxWidth: 260 }}>
            {isPositive
              ? 'es lo que te quedó después de todos los costos y gastos'
              : 'es la pérdida del período después de todos los costos y gastos'}
          </div>
        </div>

        {/* KPI pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            {
              label: 'Vendiste',
              value: fmt(cur.net_revenue),
              delta: prev ? calcDelta(cur.net_revenue, prev.net_revenue) : null,
              color: undefined as string | undefined,
              hint:  undefined as string | undefined,
            },
            {
              label: 'Margen neto',
              value: cur.net_margin_pct.toFixed(1) + '%',
              delta: prev ? calcDelta(cur.net_margin_pct, prev.net_margin_pct) : null,
              color: undefined as string | undefined,
              hint:  undefined as string | undefined,
            },
            {
              label: 'ROAS pauta',
              value: totalAdSpend > 0 ? (totalRoas ?? 0).toFixed(2) + 'x' : '—',
              delta: null as number | null,
              color: totalRoas !== null && totalRoas < 3 ? 'var(--red)' : 'var(--text)',
              hint:  totalRoas !== null ? (totalRoas < 3 ? 'bajo meta' : 'sobre meta') : undefined,
            },
            ...(netDelta !== null ? [{
              label: 'Vs período ant.',
              value: (netDelta > 0 ? '+' : '') + netDelta + '%',
              delta: null as number | null,
              color: netDelta >= 0 ? 'var(--green)' : 'var(--red)',
              hint:  prev ? 'Ant: ' + fmt(prev.ebitda) : undefined,
            }] : []),
          ] as { label: string; value: string; delta: number | null; color?: string; hint?: string }[]).map(k => (
            <div key={k.label} style={{
              padding: '8px 14px',
              background: 'var(--surface)',
              borderRadius: 9,
              border: '1px solid var(--border)',
              textAlign: 'center',
              minWidth: 80,
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>
                {k.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15,
                fontVariantNumeric: 'tabular-nums',
                color: k.color ?? 'var(--text)',
                whiteSpace: 'nowrap',
              }}>
                {k.value}
              </div>
              {k.delta !== undefined && k.delta !== null && (
                <div style={{ fontSize: 9, marginTop: 2, color: k.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {k.delta > 0 ? '↑' : '↓'} {Math.abs(k.delta)}%
                </div>
              )}
              {k.hint && !(k.delta !== undefined && k.delta !== null) && (
                <div style={{ fontSize: 9, marginTop: 2, color: 'var(--muted)' }}>{k.hint}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Two columns ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 14,
        alignItems: 'start',
        width: '100%',
        minWidth: 0,
      }}>

        {/* ════════════════════════════
            COLUMNA IZQUIERDA — Gráfico neto + Cascada
        ════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {/* Gráfico resultado neto */}
          <div style={{ ...card, minWidth: 0 }}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Resultado neto — últimos 6 meses</div>
                <div style={cardSub}>¿ganando o perdiendo mes a mes?</div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} />
                  Ganancia
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }} />
                  Pérdida
                </span>
              </div>
            </div>
            <div style={{ padding: '14px 16px 10px', overflow: 'hidden' }}>
              <canvas ref={netRef} style={{ display: 'block', maxWidth: '100%' }} />
            </div>
          </div>

          {/* Cascada P&G */}
          <div style={{ ...card, minWidth: 0, overflow: 'hidden' }}>
          <div style={cardHeader}>
            <div>
              <div style={cardTitle}>¿Qué pasó con tu dinero?</div>
              <div style={cardSub}>flujo de dinero paso a paso</div>
            </div>
          </div>

          {/* Lo que vendiste */}
          <WFStep
            icon="💰"
            label="Lo que vendiste"
            sublabel="ventas brutas antes de descuentos"
            amount={fmt(cur.gross_revenue)}
            prevLabel={prev ? `Ant: ${fmt(prev.gross_revenue)}` : undefined}
            delta={prev ? calcDelta(cur.gross_revenue, prev.gross_revenue) : null}
          >
            {cur.total_discounts > 0 && (
              <SubRow label="(-) Descuentos" value={`−${fmt(cur.total_discounts)}`} valueColor="var(--red)" />
            )}
          </WFStep>

          <WFDivider />

          {/* Te ingresaron */}
          <WFStep
            icon="="
            label="Te ingresaron en total"
            sublabel="ventas reales después de descuentos"
            amount={fmt(cur.net_revenue)}
            prevLabel={prev ? `Ant: ${fmt(prev.net_revenue)}` : undefined}
            delta={prev ? calcDelta(cur.net_revenue, prev.net_revenue) : null}
            isSubtotal
          />

          {/* Costo de lo vendido */}
          <WFStep
            icon="📦"
            label="Costo de lo que vendiste"
            sublabel="lo que pagaste para producir o comprar"
            amount={cur.cost_of_goods > 0 ? `−${fmt(cur.cost_of_goods)}` : '$0'}
            amountColor={cur.cost_of_goods > 0 ? 'var(--red)' : 'var(--muted)'}
            prevLabel={prev && prev.cost_of_goods > 0 ? `Ant: −${fmt(prev.cost_of_goods)}` : undefined}
          />

          <WFDivider />

          {/* Ganancia bruta */}
          <WFStep
            icon="="
            label="Ganancia bruta"
            sublabel="después de cubrir el costo del producto"
            amount={fmt(cur.gross_profit)}
            amountColor={cur.gross_profit >= 0 ? 'var(--gold)' : 'var(--red)'}
            prevLabel={prev ? `Ant: ${fmt(prev.gross_profit)}` : undefined}
            delta={prev ? calcDelta(cur.gross_profit, prev.gross_profit) : null}
            isSubtotal
          />

          {/* Publicidad */}
          <WFStep
            icon="📣"
            label="Publicidad"
            sublabel="inversión en pautas del período"
            amount={cur.ad_spend > 0 ? `−${fmt(cur.ad_spend)}` : '$0'}
            amountColor={cur.ad_spend > 0 ? 'var(--orange)' : 'var(--muted)'}
            prevLabel={prev && prev.ad_spend > 0 ? `Ant: −${fmt(prev.ad_spend)}` : undefined}
          />

          {/* Gastos fijos */}
          <WFStep
            icon="🏢"
            label="Gastos fijos"
            sublabel="arriendo, sueldos, servicios"
            amount={cur.fixed_expenses > 0 ? `−${fmt(cur.fixed_expenses)}` : '$0'}
            amountColor={cur.fixed_expenses > 0 ? 'var(--red)' : 'var(--muted)'}
            prevLabel={prev && prev.fixed_expenses > 0 ? `Ant: −${fmt(prev.fixed_expenses)}` : undefined}
          />

          {/* Otros gastos */}
          <WFStep
            icon="🔄"
            label="Otros gastos"
            sublabel="comisiones, envíos, materiales"
            amount={cur.variable_expenses > 0 ? `−${fmt(cur.variable_expenses)}` : '$0'}
            amountColor={cur.variable_expenses > 0 ? 'var(--text2)' : 'var(--muted)'}
            prevLabel={prev && prev.variable_expenses > 0 ? `Ant: −${fmt(prev.variable_expenses)}` : undefined}
          />

          <WFDivider />

          {/* Resultado final */}
          <WFStep
            icon="🏁"
            label="Lo que te quedó"
            sublabel="resultado neto después de todo"
            amount={fmt(cur.ebitda)}
            amountColor={cur.ebitda >= 0 ? 'var(--green)' : 'var(--red)'}
            isFinal
          />
        </div>{/* /cascada */}
        </div>{/* /col izq */}

        {/* ════════════════════════════
            COLUMNA DERECHA — ROAS + Publicidad
        ════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {/* Gráfico ROAS histórico */}
          <div style={{ ...card, minWidth: 0 }}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>ROAS — historial de publicidad</div>
                <div style={cardSub}>retorno por cada $1 invertido en pautas</div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)',
                color: 'var(--gold)', flexShrink: 0, alignSelf: 'flex-start',
                whiteSpace: 'nowrap',
              }}>
                meta mínima: 3x
              </span>
            </div>
            <div style={{ padding: '14px 16px 10px', overflow: 'hidden' }}>
              <canvas ref={roasRef} style={{ display: 'block', maxWidth: '100%' }} />
            </div>
          </div>

          {/* Análisis de publicidad */}
          <div style={{ ...card, minWidth: 0 }}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Análisis de publicidad — período actual</div>
                <div style={cardSub}>inversión, retorno y ROAS por campaña</div>
              </div>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, minWidth: 0 }}>
                {[
                  {
                    label: 'Invertiste',
                    value: totalAdSpend > 0 ? fmt(totalAdSpend) : '$0',
                    color: totalAdSpend > 0 ? 'var(--red)' : 'var(--muted)',
                    hint: 'en publicidad',
                  },
                  {
                    label: 'Ventas atribuidas',
                    value: totalAdRevenue > 0 ? fmt(totalAdRevenue) : '$0',
                    color: totalAdRevenue > 0 ? 'var(--green)' : 'var(--muted)',
                    hint: 'por pauta',
                  },
                  {
                    label: 'ROAS',
                    value: totalRoas !== null ? totalRoas.toFixed(2) + 'x' : '—',
                    color: totalRoas === null ? 'var(--muted)' : totalRoas >= 3 ? 'var(--green)' : 'var(--red)',
                    hint: totalRoas !== null && totalRoas < 3 ? 'bajo meta (3x)' : totalRoas !== null ? 'sobre meta (3x)' : 'sin datos',
                    highlight: totalRoas !== null && totalRoas < 3,
                  },
                ].map(k => (
                  <div key={k.label} style={{
                    padding: '10px 10px',
                    background: 'var(--surface)',
                    borderRadius: 8,
                    textAlign: 'center',
                    border: k.highlight ? '1px solid rgba(248,113,113,0.25)' : '1px solid var(--border)',
                    minWidth: 0,
                  }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>
                      {k.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16,
                      color: k.color, fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}>
                      {k.value}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{k.hint}</div>
                  </div>
                ))}
              </div>

              {/* Tabla campañas */}
              {hasAds ? (
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
                    <thead>
                      <tr>
                        {['Campaña', 'Canal', 'Inversión', 'Ventas atr.', 'ROAS'].map(h => (
                          <th key={h} scope="col" style={{
                            fontSize: 9, textTransform: 'uppercase', letterSpacing: '.07em',
                            fontWeight: 700, color: 'var(--muted)', padding: '7px 10px',
                            textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => {
                        const r = c.spend && c.spend > 0 && c.attributed_revenue !== null
                          ? (c.attributed_revenue ?? 0) / c.spend
                          : null
                        const good = r !== null && r >= 3
                        return (
                          <tr key={c.id}>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text)', fontWeight: 500, borderBottom: '1px solid var(--border)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.campaign_name ?? '—'}
                            </td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>
                              {platformChip(c.platform)}
                            </td>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text2)', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {c.spend ? fmt(c.spend) : '—'}
                            </td>
                            <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: c.attributed_revenue ? 'var(--green)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
                              {c.attributed_revenue != null ? fmt(c.attributed_revenue) : '—'}
                            </td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>
                              {r !== null ? (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                  background: good ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                                  color: good ? 'var(--green)' : 'var(--red)',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {r.toFixed(2)}x
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}

                      {campaigns.length > 1 && (
                        <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                          <td colSpan={2} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            Total
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(totalAdSpend)}
                          </td>
                          <td style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(totalAdRevenue)}
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            {totalRoas !== null && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                background: totalRoas >= 3 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                                color: totalRoas >= 3 ? 'var(--green)' : 'var(--red)',
                              }}>
                                {totalRoas.toFixed(2)}x
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--muted)' }}>
                  Sin campañas registradas en este período.
                </div>
              )}

              {/* Insight */}
              {hasAds && totalRoas !== null && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 8,
                  background: totalRoas < 3 ? 'rgba(248,113,113,0.05)' : 'rgba(52,211,153,0.05)',
                  border: `1px solid ${totalRoas < 3 ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)'}`,
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{totalRoas < 3 ? '⚠️' : '✅'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                    {totalRoas < 3 ? (
                      <>
                        ROAS de <strong style={{ color: 'var(--red)' }}>{totalRoas.toFixed(2)}x</strong> — por debajo del mínimo de 3x.
                        {' '}Revisa qué campañas tienen peor retorno y considera pausarlas.
                      </>
                    ) : (
                      <>
                        Publicidad funcionando bien — ROAS de <strong style={{ color: 'var(--green)' }}>{totalRoas.toFixed(2)}x</strong>.
                        {' '}Considera aumentar el presupuesto en las campañas con mejor retorno.
                      </>
                    )}
                  </span>
                </div>
              )}

            </div>
          </div>

        </div>
        {/* /right col */}

      </div>
      {/* /two-col */}

    </div>
  )
}
