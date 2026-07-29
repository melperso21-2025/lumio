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
const fmtN = (n: number) => (n >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(n)).toLocaleString('es-EC')

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
    }}>
      {p ?? '—'}
    </span>
  )
}

// ── Canvas charts ──────────────────────────────────────────────────────────

function drawNetResultChart(canvas: HTMLCanvasElement, data: MonthlyPoint[]) {
  const dpr = window.devicePixelRatio || 1
  const W = Math.max((canvas.parentElement?.clientWidth ?? 300) - 2, 100)
  const H = 160
  canvas.width = W * dpr; canvas.height = H * dpr
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  const green = css('--green'), red = css('--red'), gold = css('--gold')
  const muted = css('--muted'), border = css('--border2')

  const pL = 52, pR = 12, pT = 20, pB = 26
  const cW = W - pL - pR, cH = H - pT - pB
  const maxA = Math.max(...data.map(d => Math.abs(d.netResult)), 1) * 1.2
  const zero = pT + cH / 2
  const slot = cW / data.length
  const bW = Math.min(slot * 0.55, 36)

  // Grid lines
  ;[-1, -0.5, 0, 0.5, 1].forEach(t => {
    const y = pT + cH * (0.5 - t * 0.5)
    ctx.strokeStyle = border
    ctx.lineWidth = t === 0 ? 1.5 : 0.7
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke()
    if (t !== 0) {
      const v = maxA * t
      const lbl = Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(Math.abs(v)))
      ctx.fillStyle = muted; ctx.font = '9px system-ui'; ctx.textAlign = 'right'
      ctx.fillText((t > 0 ? '+' : '−') + '$' + lbl, pL - 4, y + 3)
    }
  })

  const tpts: { x: number; y: number }[] = []

  data.forEach((d, i) => {
    const v  = d.netResult
    const cx = pL + slot * i + slot * 0.5
    const bH = Math.max(Math.abs(v) / maxA * (cH / 2), 4)
    const pos = v >= 0

    const gr = ctx.createLinearGradient(0, pos ? zero - bH : zero, 0, pos ? zero : zero + bH)
    if (pos) { gr.addColorStop(0, green); gr.addColorStop(1, green + '44') }
    else      { gr.addColorStop(0, red + '44'); gr.addColorStop(1, red) }
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.roundRect(cx - bW / 2, pos ? zero - bH : zero, bW, bH, 3)
    ctx.fill()

    const absK = Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(1) + 'k' : String(Math.abs(Math.round(v)))
    ctx.fillStyle = pos ? green : red
    ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'
    ctx.fillText((pos ? '+' : '−') + '$' + absK, cx, pos ? zero - bH - 5 : zero + bH + 11)

    ctx.fillStyle = muted; ctx.font = '9px system-ui'
    ctx.fillText(d.label, cx, H - 5)

    tpts.push({ x: cx, y: zero - (v / maxA) * (cH / 2) })
  })

  // Trend line
  ctx.strokeStyle = gold + 'BB'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.lineJoin = 'round'
  ctx.beginPath(); tpts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke()
  ctx.setLineDash([])
  tpts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fillStyle = gold; ctx.fill()
  })
}

function drawROASChart(canvas: HTMLCanvasElement, data: MonthlyPoint[]) {
  const dpr = window.devicePixelRatio || 1
  const W = Math.max((canvas.parentElement?.clientWidth ?? 300) - 2, 100)
  const H = 130
  canvas.width = W * dpr; canvas.height = H * dpr
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, W, H)

  const green = css('--green'), red = css('--red'), gold = css('--gold')
  const muted = css('--muted'), orange = css('--orange')
  const cardBg = css('--card'), border = css('--border2')

  const bench = 3, maxR = 5
  const pL = 10, pR = 44, pT = 20, pB = 22
  const cW = W - pL - pR, cH = H - pT - pB
  const gap = cW / Math.max(data.length - 1, 1)

  // Y-axis grid
  ;[0, 1, 2, 3, 4, 5].forEach(v => {
    const y = pT + cH * (1 - v / maxR)
    ctx.strokeStyle = border; ctx.lineWidth = 0.7
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke()
    ctx.fillStyle = muted; ctx.font = '9px system-ui'; ctx.textAlign = 'left'
    ctx.fillText(v + 'x', pL + cW + 6, y + 3)
  })

  // Green zone above benchmark
  const benchY = pT + cH * (1 - bench / maxR)
  const zg = ctx.createLinearGradient(0, pT, 0, benchY)
  zg.addColorStop(0, green + '12'); zg.addColorStop(1, green + '04')
  ctx.fillStyle = zg; ctx.fillRect(pL, pT, cW, benchY - pT)

  // Benchmark line
  ctx.strokeStyle = gold + '88'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3])
  ctx.beginPath(); ctx.moveTo(pL, benchY); ctx.lineTo(pL + cW, benchY); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = gold + 'BB'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'left'
  ctx.fillText('3x meta', pL + cW + 6, benchY + 3)

  const pts = data.map((d, i) => ({
    x: pL + gap * i,
    y: d.roas !== null ? pT + cH * (1 - Math.min(d.roas, maxR) / maxR) : null,
    r: d.roas,
    label: d.label,
  }))

  const valid = pts.filter(p => p.y !== null)

  if (valid.length === 0) {
    ctx.fillStyle = muted; ctx.font = '11px system-ui'; ctx.textAlign = 'center'
    ctx.fillText('Sin datos de publicidad en este período', W / 2, H / 2)
    pts.forEach(p => {
      ctx.fillStyle = muted; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
      ctx.fillText(p.label, p.x, H - 5)
    })
    return
  }

  // Area fill
  const ag = ctx.createLinearGradient(0, pT, 0, pT + cH)
  ag.addColorStop(0, orange + '40'); ag.addColorStop(1, orange + '05')
  ctx.beginPath()
  let first = true
  valid.forEach(p => {
    if (first) { ctx.moveTo(p.x, pT + cH); ctx.lineTo(p.x, p.y!); first = false }
    else ctx.lineTo(p.x, p.y!)
  })
  ctx.lineTo(valid[valid.length - 1].x, pT + cH)
  ctx.closePath(); ctx.fillStyle = ag; ctx.fill()

  // Line
  ctx.strokeStyle = orange; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
  ctx.beginPath(); first = true
  valid.forEach(p => { first ? ctx.moveTo(p.x, p.y!) : ctx.lineTo(p.x, p.y!); first = false })
  ctx.stroke()

  // Dots + value labels
  valid.forEach(p => {
    const good = (p.r ?? 0) >= bench
    ctx.beginPath(); ctx.arc(p.x, p.y!, 6, 0, Math.PI * 2)
    ctx.fillStyle = (good ? green : red) + '22'; ctx.fill()
    ctx.beginPath(); ctx.arc(p.x, p.y!, 4, 0, Math.PI * 2)
    ctx.fillStyle = good ? green : red; ctx.fill()
    ctx.strokeStyle = cardBg; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = good ? green : red
    ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'
    ctx.fillText((p.r ?? 0).toFixed(2) + 'x', p.x, p.y! - 9)
  })

  // All month labels
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
  invertDelta?: boolean
  isSubtotal?: boolean
  isFinal?: boolean
  children?: React.ReactNode
}

function WFStep({
  icon, label, sublabel, amount, amountColor,
  prevLabel, delta, invertDelta = false,
  isSubtotal, isFinal, children,
}: StepProps) {
  const showDelta = delta !== null && delta !== undefined
  const isPos = invertDelta ? (delta ?? 0) < 0 : (delta ?? 0) > 0
  const deltaColor = showDelta
    ? delta === 0 ? 'var(--muted)' : isPos ? 'var(--green)' : 'var(--red)'
    : 'var(--muted)'

  const bg = isFinal
    ? 'rgba(52,211,153,0.04)'
    : isSubtotal
    ? 'rgba(245,200,66,0.04)'
    : 'transparent'

  const dotBorder = isFinal ? 'var(--green)' : isSubtotal ? 'var(--gold)' : 'var(--border2)'
  const dotBg = isFinal ? 'var(--green)' : isSubtotal ? 'rgba(245,200,66,0.15)' : 'var(--card)'
  const dotSize = isFinal ? 10 : 8

  return (
    <div style={{ background: bg }}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Connector */}
        <div style={{ width: 22, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 2, background: 'var(--border2)', flex: isFinal ? '0 0 10px' : 1 }} />
          <div style={{
            width: dotSize, height: dotSize, borderRadius: '50%',
            border: `2px solid ${dotBorder}`, background: dotBg,
            flexShrink: 0, margin: '8px 0', zIndex: 1,
          }} />
          {!isFinal && <div style={{ width: 2, background: 'var(--border2)', flex: 1 }} />}
          {isFinal  && <div style={{ width: 2, background: 'linear-gradient(to bottom,var(--border2),transparent)', flex: 1 }} />}
        </div>

        {/* Content */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: isFinal ? '14px 0 14px 10px' : '10px 0 10px 10px',
          gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isSubtotal ? 12 : isFinal ? 13 : 11,
              fontWeight: isSubtotal || isFinal ? 600 : 400,
              color: isSubtotal || isFinal ? 'var(--text)' : 'var(--text2)',
              fontFamily: isFinal ? 'var(--font-syne)' : undefined,
            }}>
              {icon} {label}
            </div>
            {sublabel && (
              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>{sublabel}</div>
            )}
            {showDelta && (
              <span style={{
                display: 'inline-flex', fontSize: 8, fontWeight: 700,
                padding: '1px 5px', borderRadius: 3, marginTop: 3,
                background: isPos ? 'rgba(52,211,153,0.1)' : delta === 0 ? 'var(--surface)' : 'rgba(248,113,113,0.1)',
                color: deltaColor,
              }}>
                {(delta ?? 0) > 0 ? '↑' : '↓'} {Math.abs(delta ?? 0)}% vs ant.
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 80 }}>
            <div style={{
              fontFamily: 'var(--font-syne)', fontWeight: isFinal ? 800 : isSubtotal ? 700 : 600,
              fontSize: isFinal ? 20 : isSubtotal ? 15 : 13,
              color: amountColor ?? (isFinal ? 'var(--green)' : isSubtotal ? 'var(--gold)' : 'var(--text)'),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {amount}
            </div>
            {prevLabel && (
              <div style={{ fontSize: 9, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                {prevLabel}
              </div>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

function SubRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 16px 5px 48px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: valueColor ?? 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
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

  // Card style shared
  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
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
    <div style={{ padding: '14px 16px', height: 'calc(100vh - 52px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Hero strip ── */}
      <div style={{
        ...card,
        overflow: 'visible',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 20px',
        flexWrap: 'wrap',
        flexShrink: 0,
        borderColor: isPositive ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)',
      }}>
        <div>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '.1em', color: isPositive ? 'var(--green)' : 'var(--red)',
            marginBottom: 4,
          }}>
            {isPositive ? '✓ Resultado positivo' : '⚠ Resultado negativo'}
          </div>
          <div style={{
            fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 38,
            color: isPositive ? 'var(--green)' : 'var(--red)',
            lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(cur.ebitda)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
            {isPositive ? 'es lo que te quedó después de todos los costos y gastos' : 'es la pérdida del período después de todos los costos y gastos'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          {[
            { label: 'Vendiste',       value: fmt(cur.net_revenue),          delta: prev ? calcDelta(cur.net_revenue, prev.net_revenue) : null },
            { label: 'Margen neto',    value: cur.net_margin_pct.toFixed(1) + '%', delta: prev ? calcDelta(cur.net_margin_pct, prev.net_margin_pct) : null },
            { label: 'ROAS pauta',     value: totalAdSpend > 0 ? (totalRoas ?? 0).toFixed(2) + 'x' : '—', color: totalRoas !== null && totalRoas < 3 ? 'var(--red)' : 'var(--text)' },
          ].map(k => (
            <div key={k.label} style={{
              padding: '8px 14px', background: 'var(--surface)',
              borderRadius: 9, border: '1px solid var(--border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>
                {k.label}
              </div>
              <div style={{
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15,
                fontVariantNumeric: 'tabular-nums', color: k.color ?? 'var(--text)',
              }}>
                {k.value}
              </div>
              {k.delta !== undefined && k.delta !== null && (
                <div style={{ fontSize: 9, marginTop: 2, color: k.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {k.delta > 0 ? '↑' : '↓'} {Math.abs(k.delta)}% vs ant.
                </div>
              )}
              {k.label === 'ROAS pauta' && totalRoas !== null && (
                <div style={{ fontSize: 9, marginTop: 2, color: 'var(--muted)' }}>meta: 3x</div>
              )}
            </div>
          ))}

          {netDelta !== null && (
            <div style={{
              padding: '8px 14px', background: 'var(--surface)',
              borderRadius: 9, border: '1px solid var(--border)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: 3 }}>
                Vs período ant.
              </div>
              <div style={{
                fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15,
                fontVariantNumeric: 'tabular-nums',
                color: netDelta >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {netDelta > 0 ? '+' : ''}{netDelta}%
              </div>
              {prev && (
                <div style={{ fontSize: 9, marginTop: 2, color: 'var(--muted)' }}>
                  Ant: {fmtN(prev.ebitda)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Two columns ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
        alignItems: 'start',
        flexShrink: 0,
      }}>

        {/* ════════════════════════════════
            COLUMNA IZQUIERDA — Cascada P&G
        ════════════════════════════════ */}
        <div style={card}>
          <div style={cardHeader}>
            <div>
              <div style={cardTitle}>¿Qué pasó con tu dinero?</div>
              <div style={cardSub}>sigue el flujo paso a paso</div>
            </div>
          </div>

          <div>
            {/* 1. Lo que vendiste */}
            <WFStep
              icon="💰" label="Lo que vendiste"
              sublabel="ventas brutas, antes de descuentos"
              amount={fmt(cur.gross_revenue)}
              prevLabel={prev ? `Ant: ${fmt(prev.gross_revenue)}` : undefined}
              delta={prev ? calcDelta(cur.gross_revenue, prev.gross_revenue) : null}
            >
              {cur.total_discounts > 0 && (
                <SubRow
                  label="(-) Descuentos y devoluciones"
                  value={`−${fmt(cur.total_discounts)}`}
                  valueColor="var(--red)"
                />
              )}
            </WFStep>

            {/* 2. Te ingresaron */}
            <WFStep
              icon="=" label="Te ingresaron en total"
              sublabel="ventas reales después de descuentos"
              amount={fmt(cur.net_revenue)}
              prevLabel={prev ? `Ant: ${fmt(prev.net_revenue)}` : undefined}
              delta={prev ? calcDelta(cur.net_revenue, prev.net_revenue) : null}
              isSubtotal
            />

            {/* 3. Costo de lo vendido */}
            <WFStep
              icon="📦" label="Costo de lo que vendiste"
              sublabel="lo que pagaste para producir o comprar los productos"
              amount={cur.cost_of_goods > 0 ? `−${fmt(cur.cost_of_goods)}` : '$0'}
              amountColor={cur.cost_of_goods > 0 ? 'var(--red)' : 'var(--muted)'}
              prevLabel={prev && prev.cost_of_goods > 0 ? `Ant: −${fmt(prev.cost_of_goods)}` : undefined}
            />

            {/* 4. Ganancia bruta */}
            <WFStep
              icon="=" label="Ganancia bruta"
              sublabel="después de cubrir el costo de los productos"
              amount={fmt(cur.gross_profit)}
              amountColor={cur.gross_profit >= 0 ? undefined : 'var(--red)'}
              prevLabel={prev ? `Ant: ${fmt(prev.gross_profit)}` : undefined}
              delta={prev ? calcDelta(cur.gross_profit, prev.gross_profit) : null}
              isSubtotal
            />

            {/* 5. Publicidad */}
            <WFStep
              icon="📣" label="Publicidad"
              sublabel="inversión en pautas del período"
              amount={cur.ad_spend > 0 ? `−${fmt(cur.ad_spend)}` : '$0'}
              amountColor={cur.ad_spend > 0 ? 'var(--orange)' : 'var(--muted)'}
              prevLabel={prev && prev.ad_spend > 0 ? `Ant: −${fmt(prev.ad_spend)}` : undefined}
            />

            {/* 6. Gastos fijos */}
            <WFStep
              icon="🏢" label="Gastos fijos del negocio"
              sublabel="arriendo, sueldos, servicios fijos"
              amount={cur.fixed_expenses > 0 ? `−${fmt(cur.fixed_expenses)}` : '$0'}
              amountColor={cur.fixed_expenses > 0 ? 'var(--red)' : 'var(--muted)'}
              prevLabel={prev && prev.fixed_expenses > 0 ? `Ant: −${fmt(prev.fixed_expenses)}` : undefined}
            />

            {/* 7. Otros gastos */}
            <WFStep
              icon="🔄" label="Otros gastos del negocio"
              sublabel="comisiones, envíos, materiales, otros egresos"
              amount={cur.variable_expenses > 0 ? `−${fmt(cur.variable_expenses)}` : '$0'}
              amountColor={cur.variable_expenses > 0 ? 'var(--text2)' : 'var(--muted)'}
              prevLabel={prev && prev.variable_expenses > 0 ? `Ant: −${fmt(prev.variable_expenses)}` : undefined}
            />

            {/* 8. Resultado final */}
            <WFStep
              icon="🏁" label="Lo que te quedó"
              sublabel="resultado neto del período, después de todo"
              amount={fmt(cur.ebitda)}
              amountColor={cur.ebitda >= 0 ? 'var(--green)' : 'var(--red)'}
              isFinal
            />
          </div>
        </div>

        {/* ════════════════════════════════
            COLUMNA DERECHA
        ════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Gráfico 1: Resultado neto mensual */}
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Resultado neto — últimos 6 meses</div>
                <div style={cardSub}>¿estás ganando o perdiendo mes a mes?</div>
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
            <div style={{ padding: '14px 16px 10px' }}>
              <canvas ref={netRef} style={{ display: 'block' }} />
            </div>
          </div>

          {/* Gráfico 2: ROAS histórico */}
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>ROAS — historial de publicidad</div>
                <div style={cardSub}>retorno por cada $1 invertido en pautas</div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.2)',
                color: 'var(--gold)', flexShrink: 0, alignSelf: 'flex-start',
              }}>
                meta mínima: 3x
              </span>
            </div>
            <div style={{ padding: '14px 16px 10px' }}>
              <canvas ref={roasRef} style={{ display: 'block' }} />
            </div>
          </div>

          {/* Análisis de publicidad */}
          <div style={card}>
            <div style={cardHeader}>
              <div>
                <div style={cardTitle}>Análisis de publicidad — período actual</div>
                <div style={cardSub}>inversión, retorno y ROAS por campaña</div>
              </div>
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* KPIs de publicidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Invertiste',        value: totalAdSpend > 0 ? fmt(totalAdSpend) : '$0',   color: totalAdSpend > 0 ? 'var(--red)' : 'var(--muted)',   hint: 'en publicidad' },
                  { label: 'Ventas atribuidas', value: totalAdRevenue > 0 ? fmt(totalAdRevenue) : '$0', color: totalAdRevenue > 0 ? 'var(--green)' : 'var(--muted)', hint: 'generadas por pauta' },
                  {
                    label: 'ROAS',
                    value: totalRoas !== null ? totalRoas.toFixed(2) + 'x' : '—',
                    color: totalRoas === null ? 'var(--muted)' : totalRoas >= 3 ? 'var(--green)' : 'var(--red)',
                    hint: totalRoas !== null && totalRoas < 3 ? 'por debajo de la meta' : totalRoas !== null ? 'por encima de la meta' : 'sin datos',
                    hintColor: totalRoas !== null && totalRoas < 3 ? 'var(--red)' : 'var(--muted)',
                    borderHighlight: totalRoas !== null && totalRoas < 3,
                  },
                ].map(k => (
                  <div key={k.label} style={{
                    padding: '10px 12px', background: 'var(--surface)',
                    borderRadius: 8, textAlign: 'center',
                    border: k.borderHighlight ? '1px solid rgba(248,113,113,0.25)' : '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>
                      {k.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 17,
                      color: k.color, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {k.value}
                    </div>
                    <div style={{ fontSize: 9, color: k.hintColor ?? 'var(--muted)', marginTop: 2 }}>
                      {k.hint}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla de campañas */}
              {hasAds ? (
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Campaña', 'Canal', 'Inversión', 'Ventas atr.', 'ROAS'].map(h => (
                          <th key={h} style={{
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
                            <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
                              {c.campaign_name ?? '—'}
                            </td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>
                              {platformChip(c.platform)}
                            </td>
                            <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text2)', borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums' }}>
                              {c.spend ? fmt(c.spend) : '—'}
                            </td>
                            <td style={{ padding: '7px 10px', fontSize: 11, borderBottom: '1px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: c.attributed_revenue ? 'var(--green)' : 'var(--muted)' }}>
                              {c.attributed_revenue != null ? fmt(c.attributed_revenue) : '—'}
                            </td>
                            <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)' }}>
                              {r !== null ? (
                                <span style={{
                                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                                  background: good ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                                  color: good ? 'var(--green)' : 'var(--red)',
                                }}>
                                  {r.toFixed(2)}x
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Fila total */}
                      {campaigns.length > 1 && (
                        <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                          <td colSpan={2} style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            Total período
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
                                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
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
                <div style={{
                  textAlign: 'center', padding: '20px 0',
                  fontSize: 12, color: 'var(--muted)',
                }}>
                  Sin campañas registradas en este período.
                </div>
              )}

              {/* Insight de publicidad */}
              {hasAds && totalRoas !== null && totalRoas < 3 && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(248,113,113,0.05)',
                  border: '1px solid rgba(248,113,113,0.15)',
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                    Tu ROAS actual es <strong style={{ color: 'var(--red)' }}>{totalRoas.toFixed(2)}x</strong>, por debajo del mínimo recomendado de 3x.
                    {' '}Por cada $1 invertido en publicidad estás recuperando ${totalRoas.toFixed(2)}.
                    {' '}Revisa qué campañas tienen peor retorno y considera pausarlas o ajustar el público objetivo.
                  </span>
                </div>
              )}

              {hasAds && totalRoas !== null && totalRoas >= 3 && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(52,211,153,0.05)',
                  border: '1px solid rgba(52,211,153,0.15)',
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                    Tu publicidad está funcionando bien — ROAS de <strong style={{ color: 'var(--green)' }}>{totalRoas.toFixed(2)}x</strong>.
                    {' '}Por cada $1 invertido estás recuperando ${totalRoas.toFixed(2)}. Considera aumentar el presupuesto en las campañas con mejor retorno.
                  </span>
                </div>
              )}

            </div>
          </div>

        </div>{/* /right col */}
      </div>{/* /two-col */}
    </div>
  )
}
