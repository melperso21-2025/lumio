# Lumio — Contexto completo del proyecto
> Documento de referencia consolidado a partir del historial completo de conversaciones (feb–jun 2026).
> Uso previsto: input de contexto para Claude Code al generar documentación formal y continuar desarrollo.

---

## 1. Resumen ejecutivo

**Lumio** es una plataforma SaaS multi-tenant de business intelligence y analítica financiera dirigida a PyMEs de Ecuador y Latinoamérica. Se desarrolla y comercializa bajo la marca de consultoría **PULSE**. Es simultáneamente:
- Un producto comercial que busca su primer cliente pagante real.
- La tesis de grado de Ismael Perugachi en Tecnología en Sistemas y Gestión de Datos, Instituto Tecnológico Superior Rumiñahui (versión académica reducida).

Ismael trabaja como Data Analytics Director en Trade; Lumio es su emprendimiento paralelo.

---

## 2. Por qué nació — origen y motivación

### 2.1 El punto de partida: PULSE como consultora (semanas 1–2, feb 2026)
Ismael quería ofrecer servicios de analítica de datos a PyMEs, pero como *servicio de consultoría independiente*, no como producto. Se definió la marca PULSE, posicionada explícitamente **entre la consultora enterprise cara y el freelance genérico** — "calidad nivel global con agilidad de socio local". Se generó portafolio profesional (one-pager, pitch deck de 10 slides, portafolio de casos) y se estudiaron referentes: Mixpanel, Amplitude, SoftExpert, Coda.

### 2.2 El caso real que lo cambió todo (semanas 3–4, feb 2026)
Un contacto trajo un cliente real: un negocio ecuatoriano de **artesanías y folclore** (sombreros de paja toquilla, chompas de cuero), con 3–5 canales de venta simultáneos (local físico, B2B, web, aeropuerto). El cliente manejaba todo en Excel y necesitaba inventario, reportes y eventualmente facturación electrónica SRI.

**La decisión clave:** en vez de construir un sistema a medida para ese único cliente, convertirlo en una **plataforma SaaS reutilizable**. Ahí nace Lumio como producto, no como proyecto de consultoría puntual.

Se analizó como referente un sistema ya existente de un socio ("Justus"): una app en AppSheet + Looker Studio con módulos de Ventas, Pautas (campañas), P&G, Clientes, Compras, Performance y Flujo de Clientes. De ahí salió el aprendizaje más importante del producto: **el módulo de Pautas/Campañas (ROAS, efectividad) es el verdadero diferenciador** — ningún competidor se lo ofrece a PyMEs ecuatorianas a ese nivel. La facturación electrónica SRI se identificó desde el inicio como el módulo más complejo, y quedó para una fase posterior.

Estimación inicial: 4–6 meses de trabajo part-time, precio de implementación entre $2.500–$5.000.

### 2.3 Empresas piloto reales (actualización ago 2026)
Ya se trabaja con datos reales de **Justus/Lio** y **JCB** para validar y ajustar los prompts de IA. El objetivo es comenzar a vender a diferentes empresas dentro del próximo mes (septiembre 2026).

---

## 3. Identidad de marca — nombre, colores, por qué

### 3.1 El nombre
**Lumio** viene de *"lumen"* — luz. La idea es que el producto le da claridad instantánea al dueño de negocio sobre cómo va su empresa, en contraste con la oscuridad de manejar todo en Excel o esperar al contador de fin de mes.

Regla de marca: el nombre se escribe **siempre en minúsculas** (`lumio`, nunca `Lumio` ni `LUMIO`) en cualquier aplicación de marca/logo.

### 3.2 Los colores — por qué dorado
- **Lumio Gold** `#F5C842 → #F09A1A` (gradiente) — acento primario, CTAs, logo.
- **Gold Base** `#E8A500` — texto sobre fondos claros, bordes activos.
- **Growth Green** `#059669` — métricas positivas / deltas ▲.
- **Alert Red** `#DC2626` — métricas negativas / alertas.
- **Void Black** `#080810` — fondo principal (modo oscuro, el modo por defecto).
- **Deep Navy** `#0D0D1A` — fondo secundario / sidebars.
- **Card Surface** `#12121F` — cards, paneles, modales.
- **Cloud White** `#E8E8F0` — texto principal.
- **Muted Purple** `#7070A0` — texto secundario / labels.

**Razón del dorado:** conecta directamente con "lumen" (luz → iluminación, claridad). Además evita deliberadamente el cliché azul/morado de casi todo el software tech. En el contexto de analítica financiera para negocios, el dorado también connota rentabilidad y resultados.

Tipografía: **Syne** (títulos/logo) + **Plus Jakarta Sans / DM Sans** (cuerpo de texto). Referentes de diseño explícitos: Linear, Vercel, Notion — minimalista, confiado, premium.

Regla de coautoría: mencionar **"by Pulse"** en contextos B2B y presentaciones — Lumio es el producto, Pulse es quien lo respalda.

---

## 4. Diseño de producto antes de programar (semanas 1–2, mar 2026)

Antes de escribir código se definió la experiencia completa:

- **Brand brief** formal (identidad visual completa).
- **Wireframe v2** de la plataforma (HTML → PDF vía WeasyPrint).
- **Flujo de onboarding en 6 pasos:** registro y perfil de empresa → datos de ejemplo precargados → primera carga de datos de pauta → ROAS calculado automáticamente (momento "aha") → primer insight de IA generado con claude-sonnet → gancho de retorno semanal.
- **Definición de "usuario activado":** no es quien se registra, es quien **ve su primer insight con sus propios datos**.
- **Decisión de producto:** los módulos P&L, Inventario y Clientes se bloquean inicialmente para forzar el camino más corto posible al valor (10–15 min desde registro hasta primer insight, sin tutorial obligatorio).
- Métricas de éxito del MVP definidas en 3 capas: onboarding, retención, viabilidad económica.

---

## 5. Arquitectura técnica — qué se eligió y por qué

### 5.1 Stack definitivo (semana 3, mar 2026)
| Capa | Elección | Motivo |
|---|---|---|
| Frontend | Next.js 16, App Router, TypeScript strict, Tailwind CSS v4 | Velocidad de desarrollo + deploy nativo en Vercel |
| Backend/DB | Supabase (PostgreSQL + RLS + triggers + storage) | Multi-tenancy con seguridad a nivel de fila sin construir backend propio |
| IA | Anthropic SDK, `claude-sonnet-4-7` | Generación de insights financieros en lenguaje natural |
| Datos | SheetJS | Import/export de Excel, formato universal para PyMEs |
| Rate limiting | Upstash Redis | Control de abuso en endpoints de IA |
| Email | Resend | Invitaciones y recuperación de cuenta |
| Deploy | Vercel → `staging.lumio.ec`, rama `dev` | Integración directa con Next.js |
| Repo | `github.com/melperso21-2025/lumio` | — |

### 5.2 Por qué esta arquitectura multi-tenant
La decisión de negocio (SaaS reutilizable, no sistema a medida) obligó a un diseño de datos donde **cada tabla lleva `company_id`** como clave de aislamiento desde el día uno. Se combinó con:
- **Soft deletes** vía `deleted_at` (nunca se borra data financiera real).
- **RLS** con funciones helper reutilizables: `get_user_company_id()`, `get_user_role()`, `is_pulse_admin()`.

Esta disciplina desde el inicio es lo que permite que el Panel Pulse Admin administre múltiples empresas clientes desde una sola instancia.

### 5.3 Aprendizajes técnicos que moldearon el código
- `CREATE OR REPLACE FUNCTION` en PostgreSQL **no permite renombrar parámetros** — obliga a `DROP + CREATE`.
- Reutilizar variables `numeric` para guardar temporalmente valores `date` falla en silencio (caso real: error `22P02` en `calculate_weekly_snapshot`).
- Los promedios de métricas de negocio (ROAS, efectividad) deben ser **ponderados** (`SUM/SUM`), no `AVG` simple.
- Antes de correr migraciones, validar constraints existentes vía `pg_constraint`.

---

## 6. Cronología de implementación de módulos

### Semana 3, mar 2026 — Fundación técnica
Layout raíz · autenticación email/password · sesión única por usuario (`session_token`) · timeout de inactividad de 60 min · sidebar colapsable filtrado por rol · flujo post-invitación (`/auth/setup-account`) · **Dashboard** base.

Se crean `DATABASE_CONTEXT.md` y `.cursorrules` en la raíz del repo — contexto persistente para que Claude/Cursor no alucineen el schema.

### Semana 4, mar 2026 — Ventas e Inventario
**Ventas / QuickSale (`/ventas`):** formulario POS-style con líneas de producto múltiples, triggers automáticos, edición con reversión de stock.
**Inventario (`/inventario`):** tabla de movimientos con filtros, trigger `tg_update_product_stock`.

### Semana 1, abr 2026 — Clientes, Proveedores, Productos
**Clientes (`/clientes`):** validaciones específicas de Ecuador (cédula módulo-10, RUC 13 dígitos, teléfono `+5939XXXXXXXX`) centralizadas en `src/lib/validations/index.ts`, trigger de LTV automático.
**Productos:** catálogo con precio/costo/stock mínimo, historial de cambios de precio.
**Proveedores:** tabla `suppliers` con datos fiscales.

### Semana 2, abr 2026 — Campañas, Finanzas, Importación masiva
**Marketing/Campañas (`/marketing`):** tabla `ad_campaigns` con ROAS y efectividad. Regla de negocio central: **`ad_campaigns.spend` es la única fuente de verdad para inversión publicitaria** (evita doble conteo con finanzas).
**Finanzas:** categorías de transacciones bancarias, trigger de saldo automático, cuentas por cobrar y pagar.
**Importación masiva:** mapeo flexible de columnas, validación dry-run, rollback vía `import_logs`.
**Pulse Admin:** gestión de empresas, invitaciones, límites por empresa.

### Semanas 3–4, abr 2026 — Validación total + AI Insights
**Bugs críticos resueltos:**
1. `calculate_weekly_snapshot` error `22P02` por confundir tipos `numeric`/`date` → reescrito. `avg_roas` y `avg_effectiveness` migrados a metodología ponderada.
2. **Doble conteo en P&L:** transacciones de categoría `marketing` excluidas de gastos operativos.

**Módulo AI Insights (`/insights`):**
- Un análisis por semana ISO (lunes–domingo de la semana anterior).
- Análisis inicial global (`type='initial'`, `week_number=0`) generado una única vez por Pulse Admin.
- Regeneración solo vía solicitud formal en tabla `insight_requests` (estados pending/approved/rejected/done).
- Primer análisis real validado con Justus/Lio: claude-sonnet identificó ROAS 10.18x vs margen neto -17%, $7.996 en capital de inventario paralizado, tendencia 25.7% crecimiento.

### Mayo 2026 — Bifurcación tesis / producto comercial
El Instituto Rumiñahui exige ceder derechos de código. Se decide **bifurcar el alcance**, no el código:
- **Versión comercial (Lumio completo):** todos los módulos, incluyendo AI Insights e importación masiva.
- **Versión académica (tesis):** Dashboard, QuickSale, P&L, Inventario, Productos, Clientes, Marketing, Reportes — **sin** AI Insights ni importación masiva (IP protegida).

Título formal de tesis: *"Sistema Web de Inteligencia Financiera para el Seguimiento de Ventas, Inventario y Rentabilidad en Pequeñas y Medianas Empresas."*

---

## 7. Estado actual (ago 2026)

Plataforma **feature-complete a nivel de módulo**, corriendo en local/staging. Auditoría de seguridad completada (18 items resueltos). Próximo objetivo: primer cliente pagante en sept 2026.

### Módulos y estado
| Módulo | Ruta | Estado | Incluido en tesis |
|---|---|---|---|
| Dashboard | `/dashboard` | ✅ Implementado | Sí |
| Ventas (QuickSale) | `/ventas` | ✅ Implementado | Sí |
| Inventario | `/inventario` | ✅ Implementado | Sí |
| Productos | `/productos` | ✅ Implementado | Sí |
| Clientes | `/clientes` | ✅ Implementado | Sí |
| Marketing / Campañas | `/marketing` | ✅ Implementado | Sí |
| Reportes Excel / P&L | `/reportes` | ✅ Implementado | Sí |
| AI Insights | `/insights` | ✅ Implementado | No (IP protegida) |
| Importación masiva | `/import` | ✅ Implementado | No (IP protegida) |
| Pulse Admin | `/admin` | ✅ Implementado | N/A (panel interno) |

---

## 8. Visión futura (post-MVP)

- Integraciones API Meta Ads, Google Ads y TikTok (automatizar carga de campañas).
- Facturación electrónica SRI Ecuador (módulo más complejo, fase v2-v3).
- Analítica predictiva.
- App móvil.
- Pricing: Trial/$0, Básico/$29, Estándar/$59, Pro/$99.

---

## 9. Referencia técnica rápida

```
Frontend:      Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4
Base de datos: Supabase (PostgreSQL + RLS + triggers + storage)
IA:            Anthropic SDK · claude-sonnet-4-7 (constante en src/lib/ai.ts)
Datos:         SheetJS (Excel import/export)
Rate limiting: Upstash Redis
Email:         Resend
Deploy:        Vercel · staging.lumio.ec · rama dev
Repo:          https://github.com/melperso21-2025/lumio
Demo ID:       4dd15f94-a915-4555-8f54-58951a7d1335
Validaciones:  src/lib/validations/index.ts (cédula, RUC, pasaporte, teléfono EC)
Contexto IA:   DATABASE_CONTEXT.md + .cursorrules (raíz del repo)
Estándares:    docs/standards/SECURITY.md · docs/standards/PENDING.md
```

---

*Consolidado a partir del historial completo de conversaciones del proyecto Lumio/PULSE. Última actualización: agosto 2026.*
