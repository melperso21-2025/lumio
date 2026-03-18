# PROMPT — Refactorizar Panel Pulse Admin (Wireframe v2.0)

## Contexto del proyecto
Estoy construyendo Lumio, una plataforma SaaS de inteligencia de negocio para PyMEs.
- Lee OBLIGATORIAMENTE docs/CURSOR_CONTEXT.md antes de escribir cualquier línea
- Los tipos de Supabase están en src/lib/supabase/database.types.ts
- Referencia visual: el wireframe v2.0 del Panel Pulse Admin

## Objetivo
Refactorizar el Panel Pulse Admin para que tenga su propio layout oscuro completo,
con sidebar oscuro propio, topbar oscuro, KpiCards adaptadas y North Star Metric con datos reales.

## Tarea
REEMPLAZA los siguientes archivos existentes:
1. src/app/pulse-admin/layout.tsx
2. src/app/pulse-admin/page.tsx

Crea UN archivo NUEVO:
3. src/components/pulse-admin/PulseSidebar.tsx

NO modifiques ningún otro archivo.

---

## ARCHIVO 1: src/app/pulse-admin/layout.tsx

### Tipo
Server Component — sin 'use client'

### Descripción
Layout completo oscuro para el Panel Pulse. Reemplaza completamente el layout anterior.
NO hereda nada del layout del dashboard normal.

### Imports
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PulseSidebar from '@/components/pulse-admin/PulseSidebar'
```

### Lógica
```typescript
// 1. Verificar auth
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')

// 2. Verificar is_pulse_admin
const { data: userData } = await supabase
  .from('users')
  .select('full_name, role, is_pulse_admin')
  .eq('id', user.id)
  .single()

if (userData?.is_pulse_admin !== true) redirect('/dashboard')
```

### JSX — layout completo oscuro

```tsx
// Fondo negro completo, altura 100vh, sin scroll en el contenedor raíz
<div style={{
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
  background: '#080810',
  color: '#E8E8F0',
}}>

  {/* Sidebar oscuro propio */}
  <PulseSidebar userName={userData?.full_name ?? 'Pulse Admin'} />

  {/* Contenido principal */}
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }}>

    {/* Banner superior */}
    <div style={{
      background: '#0F1020',
      borderBottom: '1px solid rgba(245,200,66,0.2)',
      padding: '7px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: 'var(--font-syne)',
        fontWeight: 700,
        fontSize: 12,
        color: '#F5C842',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#F5C842',
          boxShadow: '0 0 6px #F5C842',
        }} />
        Pulse Superadmin · Panel de control
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, color: 'rgba(245,200,66,0.5)' }}>
          Solo visible para el equipo Pulse
        </span>
        {/* Botón volver a vista cliente */}
        <a
          href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            textDecoration: 'none',
          }}
        >
          ← Volver a vista cliente
        </a>
      </div>
    </div>

    {/* Área de contenido scrollable */}
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {children}
    </div>

  </div>
</div>
```

---

## ARCHIVO 2: src/components/pulse-admin/PulseSidebar.tsx

### Tipo
'use client' — usa usePathname para marcar el ítem activo

### Props
```typescript
interface PulseSidebarProps {
  userName: string
}
```

### Imports
```typescript
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
```

### Estructura visual exacta (basada en wireframe v2.0)

```tsx
<div style={{
  width: 200,
  flexShrink: 0,
  background: '#0A0A18',
  borderRight: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
}}>

  {/* Logo */}
  <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>
      <span style={{ color: '#FFFFFF' }}>lu</span>
      <span style={{ color: '#E8A500' }}>m</span>
      <span style={{ color: '#FFFFFF' }}>io</span>
    </div>
    <div style={{ fontSize: 9, color: 'rgba(245,200,66,0.5)', fontWeight: 600, letterSpacing: '0.12em', marginTop: 2 }}>
      BY PULSE
    </div>
  </div>

  {/* Navegación */}
  <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>

    {/* Sección PANEL PULSE */}
    <div style={{ padding: '0 18px', marginBottom: 6 }}>
      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
        Panel Pulse
      </p>
    </div>

    {/* Items de navegación */}
    {[
      { href: '/pulse-admin',            icon: '◈', label: 'Visión general'  },
      { href: '/pulse-admin/companies',  icon: '🏢', label: 'Empresas'       },
      { href: '/pulse-admin/new-company',icon: '+',  label: 'Nueva empresa'  },
      { href: '/pulse-admin/metrics',    icon: '📊', label: 'Métricas MVP'   },
    ].map(item => (
      <NavItem
        key={item.href}
        href={item.href}
        icon={item.icon}
        label={item.label}
        isActive={pathname === item.href}
      />
    ))}

    {/* Sección ACCESO */}
    <div style={{ padding: '16px 18px 6px' }}>
      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
        Acceso
      </p>
    </div>

    <NavItem
      href="/dashboard"
      icon="←"
      label="Volver a cliente"
      isActive={false}
      isSecondary
    />
  </nav>

  {/* User chip inferior */}
  <div style={{
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', gap: 10,
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: 'linear-gradient(135deg, #F5C842, #F09A1A)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#1A1B2E', flexShrink: 0,
    }}>
      {userName.slice(0, 2).toUpperCase()}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#E8E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {userName}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(245,200,66,0.6)' }}>
        Superadmin · Pulse
      </div>
    </div>
  </div>

</div>
```

### Componente interno NavItem
```typescript
function NavItem({
  href, icon, label, isActive, isSecondary = false
}: {
  href: string; icon: string; label: string
  isActive: boolean; isSecondary?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 18px',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive
          ? '#F5C842'
          : isSecondary
          ? 'rgba(255,255,255,0.3)'
          : 'rgba(255,255,255,0.6)',
        background: isActive ? 'rgba(245,200,66,0.08)' : 'transparent',
        borderLeft: isActive ? '2px solid #F5C842' : '2px solid transparent',
        textDecoration: 'none',
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </Link>
  )
}
```

---

## ARCHIVO 3: src/app/pulse-admin/page.tsx

### Tipo
Server Component — sin 'use client'

### Imports
```typescript
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AiInsightBox from '@/components/ui/AiInsightBox'
```

### Lógica de datos
```typescript
const supabase = await createClient()

// 1. Conteo de empresas
const { count: companiesCount } = await supabase
  .from('companies')
  .select('id', { count: 'exact', head: true })
  .is('deleted_at', null)

// 2. Conteo de usuarios
const { count: usersCount } = await supabase
  .from('users')
  .select('id', { count: 'exact', head: true })
  .is('deleted_at', null)

// 3. Lista de empresas con datos
const { data: companiesList } = await supabase
  .from('companies')
  .select('id, name, plan, status, created_at')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })

const companies = companiesList ?? []

// 4. North Star Metric — empresas con 2+ insights en últimos 30 días
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

const { data: insightsData } = await supabase
  .from('ai_insights')
  .select('company_id')
  .gte('created_at', thirtyDaysAgoStr)

// Contar insights por empresa
const insightsByCompany: Record<string, number> = {}
insightsData?.forEach(i => {
  insightsByCompany[i.company_id] = (insightsByCompany[i.company_id] ?? 0) + 1
})
const companiesWithTwoPlusInsights = Object.values(insightsByCompany).filter(c => c >= 2).length
const northStarPct = companies.length > 0
  ? Math.round((companiesWithTwoPlusInsights / companies.length) * 100) : 0
```

### JSX — estructura adaptada al fondo oscuro

**Topbar adaptado:**
```tsx
<div style={{ background: '#0F1020', borderBottom: '1px solid rgba(245,200,66,0.12)' }}>
  <Topbar pageTitle="Panel Pulse" pageSubtitle="Visión global de todas las empresas" />
</div>
```

**Contenido:**
```tsx
<div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
```

**North Star Metric — AiInsightBox gold:**
```tsx
<AiInsightBox
  variant="gold"
  title="North Star Metric — Semana actual"
  text={`${companiesWithTwoPlusInsights} de ${companies.length} empresa${companies.length !== 1 ? 's' : ''} ${
    companies.length !== 1 ? 'tienen' : 'tiene'
  } usuarios que vieron 2+ insights de IA en los últimos 30 días — ${northStarPct}% de activación real. Meta MVP: 80%.${
    companiesWithTwoPlusInsights > 0
      ? ` ${companies[0]?.name ?? 'La primera empresa'} lidera con más insights esta semana.`
      : ' Aún no hay empresas con 2+ insights. Incentiva el uso de IA Insights esta semana.'
  }`}
/>
```

**Grid 5 KpiCards adaptadas al fondo oscuro:**
Usar KpiCard normal pero envuelto en override de colores:
```tsx
// Cada KpiCard necesita un wrapper con override para que se vea bien en fondo oscuro
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 10,
}}>
  {/* Wrapper para cada KpiCard con override oscuro */}
  {[
    { label: 'MRR total',         prefix: '$', value: 0,              compare: 'Meta mes 3: $1,000', isGold: true },
    { label: 'Empresas activas',  prefix: '',  value: companiesCount ?? 0, compare: '' },
    { label: 'Usuarios totales',  prefix: '',  value: usersCount ?? 0,     compare: '' },
    { label: 'Churn mensual',     suffix: '%', value: 0,              compare: 'Meta: <5%' },
    { label: 'Insights generados',prefix: '',  value: insightsData?.length ?? 0, compare: 'Últimos 30 días' },
  ].map(kpi => (
    <div key={kpi.label} style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 6 }}>
        {kpi.label}
      </div>
      <div className="font-syne font-bold" style={{ fontSize: 22, color: kpi.isGold ? '#F5C842' : '#E8E8F0' }}>
        {kpi.prefix}{typeof kpi.value === 'number' ? kpi.value : kpi.value}{kpi.suffix ?? ''}
      </div>
      {kpi.compare && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
          {kpi.compare}
        </div>
      )}
    </div>
  ))}
</div>
```

**Tabla de empresas adaptada al fondo oscuro:**
```tsx
<div style={{
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  padding: 20,
}}>
  <h2 className="font-syne font-bold" style={{ fontSize: 14, color: '#E8E8F0', marginBottom: 16 }}>
    Empresas registradas
  </h2>

  {companies.length === 0 ? (
    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 32 }}>
      No hay empresas registradas todavía
    </p>
  ) : (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {['Empresa', 'Plan', 'Estado', 'Insights 30d', 'Desde'].map(h => (
            <th key={h} style={{
              textAlign: 'left', padding: '10px 12px',
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 600, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {companies.map(c => {
          const insights = insightsByCompany[c.id] ?? 0
          const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
            active:    { bg: 'rgba(5,150,105,0.15)',  color: '#34D399', label: 'Activa'     },
            trial:     { bg: 'rgba(217,119,6,0.15)',  color: '#FCD34D', label: 'Prueba'     },
            suspended: { bg: 'rgba(220,38,38,0.15)',  color: '#F87171', label: 'Suspendida' },
          }
          const st = statusConfig[c.status ?? ''] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', label: c.status ?? '—' }
          return (
            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '10px 12px', color: '#E8E8F0', fontWeight: 500 }}>{c.name}</td>
              <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)' }}>{c.plan ?? '—'}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: st.bg, color: st.color, fontWeight: 500 }}>
                  {st.label}
                </span>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{
                  fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
                  color: insights >= 2 ? '#34D399' : insights === 1 ? '#FCD34D' : 'rgba(255,255,255,0.3)',
                }}>
                  {insights}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>
                  {insights >= 2 ? '✓' : insights === 1 ? '~' : '—'}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                {c.created_at ? new Date(c.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )}
</div>
```

---

## Reglas de código — OBLIGATORIAS

1. TypeScript estricto — tipos explícitos en TODO
2. El Panel Pulse NO usa variables CSS var(--text), var(--card) etc.
   porque esas variables son para el tema claro del dashboard.
   Usar SIEMPRE valores directos: '#E8E8F0', 'rgba(255,255,255,0.5)', '#F5C842', etc.
3. La única excepción son var(--font-syne) y var(--font-jakarta) que sí aplican
4. PulseSidebar usa 'use client' por usePathname — el resto son Server Components
5. El layout NO hereda sidebar ni topbar del dashboard — es completamente independiente
6. Comentarios en español
7. NO usar librerías externas de UI
8. El botón "Volver a vista cliente" es un <a href="/dashboard"> — no un Link
   para evitar problemas de navegación entre route groups
