# LUMIO — Prompts por tarea para Cursor AI
# Úsalos en orden. Pega uno a la vez en Ctrl+L de Cursor.
# Antes de cualquier prompt, asegúrate de haber pegado el CURSOR_CONTEXT.md

---

## PROMPT 1 — Sidebar

```
Tengo un proyecto Next.js 16 con Tailwind v4 y Supabase.
Lee el archivo docs/CURSOR_CONTEXT.md para entender el proyecto completo.
Los tipos de la base de datos están en src/lib/supabase/database.types.ts

Crea el componente: src/components/layout/Sidebar.tsx

Requisitos de diseño:
- Ancho: 220px fijo, height: 100vh, overflow: hidden
- Fondo: var(--surface), borde derecho: 1px solid var(--border)
- Display: flex, flex-direction: column, justify-content: space-between

Logo arriba:
- Texto "lumio" en font-syne font-extrabold, con la "m" en color var(--gold)
- "by Pulse" debajo en 10px, tracking-widest, uppercase, color var(--muted)

Navegación agrupada en secciones con labels en 9px uppercase tracking-wide color muted:
- Principal: Dashboard (ícono ◈)
- Operaciones: Ventas 💰, Clientes 👥, Inventario 📦, Bancos 🏦
- Analítica: Pautas 📣 (badge ★ dorado), P&G 📈
- Inteligencia: IA Insights ✦ (badge "New" dorado)
- Configuración: Usuarios & Roles 🔐, Importar datos ⬆
- Si isPulseAdmin=true, mostrar sección "● Pulse Admin" con ítem "Panel Pulse" 🏢

Estilo de cada nav item:
- Padding: 7px 12px, border-radius: 7px, font-size: 12.5px
- Color normal: var(--text2)
- Hover: background var(--hover)
- Activo: background var(--gold-bg), color var(--gold),
  border-left: 2px solid var(--gold)
- Usa usePathname() de next/navigation para detectar la ruta activa

User chip abajo:
- Avatar circular 28px con iniciales del nombre en font-syne bold
- Fondo del avatar: gradiente linear-gradient(135deg, #F5C842, #F09A1A)
- Nombre en 12px font-semibold, rol en 10px color muted
- Separado del nav con border-top: 1px solid var(--border)
- Padding: 12px

Props del componente:
interface SidebarProps {
  userName?: string
  userRole?: string
  companyName?: string
  isPulseAdmin?: boolean
}

Rutas de navegación:
- Dashboard → /dashboard
- Ventas → /sales
- Clientes → /customers
- Inventario → /inventory
- Bancos → /finance
- Pautas → /ad-campaigns
- P&G → /profit-loss
- IA Insights → /ai-insights
- Usuarios & Roles → /settings/users
- Importar datos → /settings/import
- Panel Pulse → /pulse-admin

IMPORTANTE:
- Todo en TypeScript con tipos explícitos
- Usar 'use client' porque usa usePathname()
- Colores SOLO con variables CSS var(--gold), var(--text), etc.
- NO usar librerías externas de íconos
- Comentarios en español
```

---

## PROMPT 2 — Topbar

```
Crea el componente:
src/components/layout/Topbar.tsx

Requisitos:
- Altura: 52px, fondo: var(--surface), borde inferior: 1px solid var(--border)
- Lado izquierdo: título de la página (prop pageTitle) en font-syne font-bold text-base
  y subtítulo opcional (prop pageSubtitle) en muted
- Lado derecho: selector de período (Esta semana | Este mes | Últimos 30 días),
  botón ghost "⬇ Exportar" y botón primario configurable (prop primaryAction?: {label, onClick})
- Sticky en top-0 z-50
- Props: pageTitle, pageSubtitle?, primaryAction?
```

---

## PROMPT 3 — Layout del dashboard

```
Crea el layout:
src/app/(dashboard)/layout.tsx

Requisitos:
- Es un Server Component que obtiene el usuario de Supabase (usar createClient de server)
- Si no hay usuario, redirect('/login')
- Layout: flex row, height 100vh, overflow hidden
- Sidebar a la izquierda (componente Sidebar)
- Área principal a la derecha: flex-1, overflow-y-auto
- Pasa los datos del usuario (nombre, rol, empresa) al Sidebar
- El Topbar lo renderiza cada page individualmente (no el layout)
  porque cada página tiene su propio título y acción primaria
```

---

## PROMPT 4 — KpiCard

```
Tengo un proyecto Next.js 16 con Tailwind v4 y Supabase.
Lee docs/CURSOR_CONTEXT.md para el contexto completo.

Crea el archivo NUEVO: src/components/ui/KpiCard.tsx
NO modifiques ningún archivo existente.

Es un componente React puro sin 'use client' (no usa hooks ni eventos).

Interface TypeScript:
interface KpiCardProps {
  label: string           // ej: "ROAS", "Ventas $"
  value: string | number  // ej: 9.8, "$4,320"
  delta?: number          // % cambio vs período anterior. positivo=verde, negativo=rojo
  compare?: string        // texto informativo: "Prom: $128.45" o "Ant: $4.0"
  isGold?: boolean        // si true, value se muestra en var(--gold)
  prefix?: string         // texto antes del valor: "$"
  suffix?: string         // texto después del valor: "%"
}

Diseño exacto:
- Contenedor: background var(--card), border 1px solid var(--border),
  border-radius 10px, padding 14px 16px
  transition border-color 0.15s
  En hover: border-color var(--gold-bdr)
- Barra superior: div de 2px height, border-radius 2px 2px 0 0,
  background var(--gold), opacity 0 en normal, opacity 1 en hover
  (posición absolute top-0 left-0 right-0)
- label: font-size 9px, text-transform uppercase, letter-spacing 0.1em,
  color var(--muted), margin-bottom 6px, font-weight 600
- value: font-family var(--font-syne), font-weight 700, font-size 22px,
  color var(--text) — si isGold=true color var(--gold)
- delta: font-size 10px, margin-top 4px
  Si positivo: color var(--green), texto "▲ X%"
  Si negativo: color var(--red), texto "▼ X%"
  Si cero o undefined: no mostrar
- compare: font-size 9px, color var(--muted), margin-top 2px

Usa position: relative en el contenedor para la barra superior absoluta.
Maneja el hover con onMouseEnter/onMouseLeave en el contenedor.
TypeScript estricto. Comentarios en español.
```

---

## PROMPT 5 — AiInsightBox

```
Tengo un proyecto Next.js 16 con Tailwind v4 y Supabase.
Lee docs/CURSOR_CONTEXT.md para el contexto completo.

Crea el archivo NUEVO: src/components/ui/AiInsightBox.tsx
NO modifiques ningún archivo existente.

Es un componente React puro sin 'use client'.

Interface TypeScript:
interface AiInsightBoxProps {
  title: string    // ej: "lumio IA · Resumen ejecutivo — Semana 10"
  text: string     // el insight en texto plano (sin HTML)
  variant?: 'gold' | 'red' | 'green' | 'blue'  // default: 'gold'
}

Variantes de color:
- gold:  background rgba(232,165,0,0.08),  border rgba(232,165,0,0.22),  icon/title color var(--gold)
- red:   background rgba(220,38,38,0.06),  border rgba(220,38,38,0.2),   icon/title color var(--red)
- green: background rgba(5,150,105,0.06),  border rgba(5,150,105,0.2),   icon/title color var(--green)
- blue:  background rgba(37,99,235,0.06),  border rgba(37,99,235,0.2),   icon/title color var(--blue)

Diseño exacto:
- Contenedor: border-radius 10px, padding 14px 18px
  display flex, flex-direction row, gap 12px, align-items flex-start
  border 1px solid (según variante)
  background (según variante)
  margin-bottom 20px

- Ícono izquierdo:
  width 28px, height 28px, border-radius 8px, flex-shrink 0
  display flex, align-items center, justify-content center
  background (misma que contenedor pero más opaco), font-size 14px
  Texto del ícono: gold="✦", red="⚠", green="✓", blue="ℹ"

- Contenido derecho:
  title: font-family var(--font-syne), font-weight 600, font-size 11px,
    color (según variante), margin-bottom 4px
  text: font-size 12px, color var(--text2), line-height 1.6

TypeScript estricto. Comentarios en español.
```

---

## PROMPT 6 — Dashboard principal

```
Tengo un proyecto Next.js 16 con Tailwind v4 y Supabase.
Lee docs/CURSOR_CONTEXT.md para el contexto completo.
Los tipos están en src/lib/supabase/database.types.ts

REEMPLAZA el archivo: src/app/(dashboard)/dashboard/page.tsx
(el actual solo tiene un mensaje de construcción — reemplázalo completo)

Es un Server Component (sin 'use client').

Imports necesarios:
- createClient desde '@/lib/supabase/server'
- redirect desde 'next/navigation'
- Topbar desde '@/components/layout/Topbar'
- KpiCard desde '@/components/ui/KpiCard'
- AiInsightBox desde '@/components/ui/AiInsightBox'

LÓGICA DE DATOS:
1. Obtener usuario autenticado — si no hay, redirect('/login')
2. Obtener company_id del usuario desde tabla 'users'
3. Obtener el snapshot más reciente:
   supabase.from('weekly_snapshots')
     .select('*')
     .eq('company_id', companyId)
     .order('year', { ascending: false })
     .order('week_number', { ascending: false })
     .limit(1)
     .single()
4. Obtener el insight más reciente:
   supabase.from('ai_insights')
     .select('executive_summary, week_number, year')
     .eq('company_id', companyId)
     .order('year', { ascending: false })
     .order('week_number', { ascending: false })
     .limit(1)
     .single()

Si no hay snapshot (error o null), usar valores por defecto de 0 para todos los KPIs.

ESTRUCTURA JSX:
1. <Topbar pageTitle="Dashboard" pageSubtitle={`Semana ${snap?.week_number} · ${year}`} />

2. Div con padding 20px, display flex, flex-direction column, gap 24px

3. <AiInsightBox
     title={`lumio IA · Semana ${insight?.week_number ?? '—'}`}
     text={insight?.executive_summary ?? 'Aún no hay suficientes datos para generar un análisis. Registra ventas y pautas para ver tus primeros insights.'}
   />

4. BLOQUE VENTAS — sección con header y 6 KpiCards en grid 6 columnas:
   Header: div con punto dorado (●), texto "Ventas", link "Ver detalle →" en dorado
   KpiCards:
   - label="Ventas" prefix="$" value={snap?.total_sales ?? 0} isGold delta={}
   - label="Transacciones" value={snap?.total_transactions ?? 0}
   - label="Ticket prom." prefix="$" value={snap?.avg_ticket ?? 0}
   - label="LPP" value={snap?.avg_lpp ?? 0} compare="líneas por pedido"
   - label="Descuentos" prefix="$" value={snap?.total_discounts ?? 0}
   - label="Margen bruto" suffix="%" value={snap?.gross_margin_pct ?? 0} isGold

5. BLOQUE PAUTAS — sección con header y 5 KpiCards en grid 5 columnas:
   Header: div con punto dorado (●), texto "Pautas Publicitarias", link "Ver detalle →"
   KpiCards:
   - label="Inversión" prefix="$" value={snap?.total_ad_spend ?? 0}
   - label="ROAS" value={snap?.avg_roas ?? 0} isGold compare="meta: >4.0"
   - label="Leads" value={snap?.total_leads ?? 0}
   - label="Efectividad" suffix="%" value={snap?.avg_effectiveness ?? 0}
   - label="CTR" suffix="%" value={snap?.avg_ctr ?? 0}

6. BLOQUE FINANZAS — sección con header y 4 KpiCards en grid 4 columnas:
   Header: div con punto verde (●), texto "Financiero", link "Ver detalle →"
   KpiCards:
   - label="Días de caja" value={snap?.cash_days ?? 0} compare="meta: >30 días"
   - label="CxC vencidas" prefix="$" value={snap?.overdue_receivables ?? 0}
   - label="Margen neto" suffix="%" value={snap?.net_margin_pct ?? 0}
   - label="Capital paral." prefix="$" value={snap?.frozen_capital ?? 0}

ESTILOS DE SECCIONES:
Cada bloque tiene este contenedor:
  background var(--card), border 1px solid var(--border),
  border-radius 12px, padding 16px 20px

El header de cada bloque:
  display flex, justify-content space-between, align-items center,
  margin-bottom 14px
  Título: font-syne font-bold 13px color var(--text)
  Punto de color: inline, 8px, border-radius 50%, margin-right 6px
  Link "Ver detalle →": font-size 11px, color var(--gold)

El grid de KpiCards:
  display grid, grid-template-columns repeat(N, 1fr), gap 10px
  donde N es el número de cards del bloque

TypeScript estricto. Comentarios en español.
NO uses datos hardcodeados — todo viene de Supabase o muestra 0/— si no hay datos.
```

---

## PROMPT 7 — Módulo de Ventas

```
Tengo un proyecto Next.js 16 con Tailwind v4 y Supabase.
Lee docs/CURSOR_CONTEXT.md para el contexto completo.
Los tipos están en src/lib/supabase/database.types.ts

Crea DOS archivos nuevos. NO modifiques archivos existentes.

ARCHIVO 1: src/app/(dashboard)/sales/page.tsx
Server Component (sin 'use client').

Imports: createClient de server, redirect, Topbar, KpiCard, AiInsightBox

Lógica:
1. Obtener usuario y company_id
2. Obtener ventas:
   supabase.from('sales')
     .select('id, sale_date, week_number, gross_total, discount_amount, lines_per_order, status, channel_id')
     .eq('company_id', companyId)
     .is('deleted_at', null)
     .order('sale_date', { ascending: false })
     .limit(50)
3. Calcular KPIs localmente desde el array:
   - total_sales = suma de gross_total
   - total_transactions = count
   - avg_lpp = promedio de lines_per_order
   - total_discounts = suma de discount_amount

JSX:
1. <Topbar pageTitle="Ventas" pageSubtitle="Registro de transacciones" />
2. div padding 20px, flex-direction column, gap 20px
3. Grid 4 cols con KpiCards: Ventas $, Transacciones, LPP prom., Descuentos $
4. div con border radius 12px, background var(--card), border, padding 20px:
   - Header: "Historial de ventas" en font-syne bold + botón "+ Registrar venta" (dorado)
   - Tabla con columnas: Fecha | Semana | Canal | LPP | Total | Descuento | Estado
   - Cada fila: font-size 12px, border-bottom 1px solid var(--border)
   - Badge de estado:
     closed → background rgba(5,150,105,0.1) color var(--green) texto "Cerrada"
     review → background rgba(217,119,6,0.1) color var(--orange) texto "Revisión"
     cancelled → background rgba(220,38,38,0.1) color var(--red) texto "Anulada"
   - Si no hay ventas: mensaje centrado "Aún no hay ventas registradas"

ARCHIVO 2: src/components/sales/QuickSaleForm.tsx
'use client' (usa useState).

Imports: createClient de '@/lib/supabase/client', useState, useRouter

Campos del formulario:
- gross_total: number (requerido, label "Total $")
- lines_per_order: number (default 1, label "Líneas por pedido")
- status: select ['closed','review','contact'] (label "Estado")
- notes: textarea opcional (label "Notas")

Al hacer submit:
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  — obtener company_id del usuario desde tabla users
  — INSERT en sales con los datos del formulario + company_id + sale_date = today

Estilo del formulario:
  background var(--card), border 1px solid var(--border), border-radius 12px, padding 20px
  Cada campo: label en 9px uppercase muted + input con estilo del login
  Botón submit: gradiente dorado, font-syne bold, width 100%

TypeScript estricto. Comentarios en español.
```

---

## PROMPT 8 — Módulo de Pautas

```
Tengo un proyecto Next.js 16 con Tailwind v4 y Supabase.
Lee docs/CURSOR_CONTEXT.md para el contexto completo.
Los tipos están en src/lib/supabase/database.types.ts

Crea DOS archivos nuevos. NO modifiques archivos existentes.

ARCHIVO 1: src/app/(dashboard)/ad-campaigns/page.tsx
Server Component (sin 'use client').

Lógica:
1. Obtener usuario y company_id
2. Obtener campañas:
   supabase.from('ad_campaigns')
     .select('id, campaign_date, week_number, campaign_name, platform, creative_name, spend, clicks, impressions, leads_count, quality_leads, transactions, attributed_revenue, roas, ctr, cpm, effectiveness_rate, conversion_rate')
     .eq('company_id', companyId)
     .is('deleted_at', null)
     .order('campaign_date', { ascending: false })
     .limit(50)
3. Calcular totales: total_spend, avg_roas, total_leads, avg_effectiveness

JSX:
1. <Topbar pageTitle="Pautas Publicitarias" pageSubtitle="Meta Ads · Google Ads · Performance semanal" />
2. div padding 20px, flex column, gap 20px
3. <AiInsightBox title="lumio IA · Análisis de pautas" text="..." />
4. Grid 6 cols — KpiCards: Inversión $, ROAS (isGold), Leads, Calidad contactos, Efectividad %, CTR %
5. Card con tabla de historial:
   Columnas: Fecha | Semana | Campaña | Plataforma | Inversión | Clicks | CTR | ROAS | Efectividad
   - ROAS: color var(--gold), font-syne bold
   - Efectividad badge:
     >= 30% → verde
     >= 10% → amber (background rgba(217,119,6,0.1) color var(--orange))
     < 10%  → rojo
   - Plataforma badge: fondo suave con nombre capitalizado
6. Botón flotante "+ Registrar pauta" (dorado, fixed bottom-6 right-6)
   Al hacer click abre/cierra el formulario NewCampaignForm debajo de la tabla

ARCHIVO 2: src/components/ad-campaigns/NewCampaignForm.tsx
'use client'.

Campos (todos con label en 9px uppercase muted):
- campaign_date: date input (default today)
- campaign_name: text
- platform: select — meta | google | tiktok | other
- creative_name: text (label "Arte / Creatividad")
- spend: number requerido (label "Inversión $")
- clicks: number
- impressions: number
- leads_count: number (label "Contactos generados")
- quality_leads: number (label "Contactos calificados")
- transactions: number (label "Transacciones completadas")
- attributed_revenue: number (label "Ventas atribuidas $")

Preview en tiempo real (debajo de los campos, antes del botón):
  Calcular y mostrar con color dorado:
  - ROAS preview = attributed_revenue / spend (si spend > 0)
  - CTR preview = clicks / impressions * 100 (si impressions > 0)
  - Efectividad preview = transactions / leads_count * 100 (si leads_count > 0)
  Mensaje: "✦ Vista previa — estos valores los calcula la base de datos automáticamente"

Al guardar: INSERT en ad_campaigns. company_id del usuario actual.
Mostrar loading state en el botón mientras guarda.
Mostrar mensaje de éxito o error con AiInsightBox variant green/red.

TypeScript estricto. Comentarios en español.
```

---

## PROMPT 9 — Panel Pulse Admin

```
Tengo un proyecto Next.js 16 con Tailwind v4 y Supabase.
Lee docs/CURSOR_CONTEXT.md para el contexto completo.
Los tipos están en src/lib/supabase/database.types.ts

Crea TRES archivos nuevos en la carpeta src/app/(pulse-admin)/
NO modifiques archivos existentes.

ARCHIVO 1: src/app/(pulse-admin)/layout.tsx
Server Component.

Lógica de seguridad:
1. Obtener usuario con createClient de server
2. Si no hay usuario → redirect('/login')
3. Obtener is_pulse_admin desde tabla users
4. Si is_pulse_admin !== true → redirect('/dashboard')

Layout JSX:
<div style={{display:'flex', flexDirection:'column', height:'100vh', background:'#080810'}}>
  {/* Banner superior */}
  <div style={{background:'#0F1020', borderBottom:'1px solid rgba(245,200,66,0.2)', padding:'6px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0}}>
    <div style={{fontFamily:'var(--font-syne)', fontWeight:700, fontSize:12, color:'#F5C842', display:'flex', alignItems:'center', gap:8}}>
      <div style={{width:6, height:6, borderRadius:'50%', background:'#F5C842', boxShadow:'0 0 6px #F5C842'}} />
      Pulse Superadmin · Panel de control
    </div>
    <div style={{fontSize:10, color:'rgba(245,200,66,0.5)'}}>
      Solo visible para el equipo Pulse
    </div>
  </div>
  {/* Contenido */}
  <div style={{flex:1, overflowY:'auto'}}>
    {children}
  </div>
</div>

ARCHIVO 2: src/app/(pulse-admin)/page.tsx
Server Component.

Lógica:
1. Obtener company_id del usuario
2. Contar empresas: supabase.from('companies').select('id', {count:'exact'}).is('deleted_at', null)
3. Contar usuarios: supabase.from('users').select('id', {count:'exact'}).is('deleted_at', null)
4. Obtener métricas más recientes: supabase.from('pulse_metrics').select('*').order('created_at', {ascending:false}).limit(5)

JSX:
1. Topbar con pageTitle="Panel Pulse" pageSubtitle="Visión global de todas las empresas"
2. div padding 20px, flex column, gap 20px
3. AiInsightBox variant="gold" con North Star Metric:
   title="North Star Metric"
   text="Panel de control de Pulse. Monitorea el estado de todas las empresas cliente."
4. Grid 4 cols con KpiCards:
   - label="Empresas activas" value={companiesCount ?? 0}
   - label="Usuarios totales" value={usersCount ?? 0}
   - label="MRR" prefix="$" value={0} compare="Meta mes 3: $1,000"
   - label="Churn" suffix="%" value={0} compare="Meta: <5%"
5. Card con tabla de empresas:
   Obtener: supabase.from('companies').select('id, name, plan, status, created_at').is('deleted_at', null)
   Columnas: Empresa | Plan | Estado | Desde
   Badge de estado: active=verde, trial=amber, suspended=rojo

ARCHIVO 3: src/app/(pulse-admin)/companies/page.tsx
Server Component simple — página placeholder.

JSX:
  <Topbar pageTitle="Empresas" pageSubtitle="Gestión de cuentas cliente" />
  <div style={{padding:20}}>
    <p style={{fontFamily:'var(--font-syne)', color:'var(--muted)', fontSize:14, textAlign:'center', marginTop:48}}>
      🚧 Gestión de empresas — próximamente
    </p>
  </div>

TypeScript estricto. Comentarios en español.
```

---

## NOTAS PARA EL AGENTE — leer siempre antes de generar código

1. Siempre crear archivos NUEVOS a menos que el prompt diga explícitamente REEMPLAZA
2. Rutas de Supabase: SIEMPRE incluir .is('deleted_at', null) en queries de tablas con soft delete
3. Colores: SOLO variables CSS var(--gold), var(--text), etc. — nunca hex directos en componentes
4. Fuentes: títulos y valores KPI en font-syne, todo lo demás en font-jakarta (default del body)
5. Gráficas: CSS puro con divs — NO importar Chart.js, Recharts ni ninguna librería de gráficos
6. Formularios: siempre 'use client', siempre con loading state en el botón submit
7. Errores de Supabase: siempre manejar el objeto error, nunca asumir que la query fue exitosa
8. TypeScript: tipos explícitos en todos los props, estados y respuestas de Supabase
9. Comentarios: en español
10. Server Components: sin 'use client' — solo para páginas y layouts que no usan hooks
