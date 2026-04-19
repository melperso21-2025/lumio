import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  ENTITY_DEFS,
  ALLOWED_VALUES,
  type EntityType,
} from '@/lib/import/entityConfig'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity') as EntityType | null
    if (!entity || !ENTITY_DEFS[entity]) {
      return NextResponse.json({ error: 'Entidad inválida' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role, is_pulse_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
    }

    const companyId = userData.company_id
    const def = ENTITY_DEFS[entity]

    // ── Sheet 1: Datos ─────────────────────────────────────────────────────
    const headers = def.fields.map((f) => f.label)
    const examples = def.fields.map((f) => f.example)
    const dataSheet = XLSX.utils.aoa_to_sheet([headers, examples])

    // Mark required columns with (*)
    const colWidths = headers.map((h, i) => ({
      wch: Math.max(h.length + (def.fields[i].required ? 2 : 0), 14),
    }))
    dataSheet['!cols'] = colWidths

    // Force text format (@) for columns that must not be auto-converted by Excel
    const textFormatLabels = new Set([
      'documento_numero', 'numero_cuenta', 'dias_entrega',
      'telefono', 'tax_id', 'numero_id',
    ])
    def.fields.forEach((f, colIdx) => {
      if (!textFormatLabels.has(f.label)) return
      // Row 2 (index 1) is the example row — mark as text
      const cellRef = XLSX.utils.encode_cell({ r: 1, c: colIdx })
      if (dataSheet[cellRef]) {
        dataSheet[cellRef].t = 's'
        dataSheet[cellRef].z = '@'
      }
    })

    // ── Sheet 2: Referencia ────────────────────────────────────────────────
    const refData: string[][] = [['Campo', 'Valores permitidos / Formato']]
    const allowedForEntity = ALLOWED_VALUES[entity] ?? []
    if (allowedForEntity.length > 0) {
      allowedForEntity.forEach(({ label, values }) => {
        refData.push([label, values.join(' | ')])
      })
    } else {
      refData.push(['—', 'No hay valores fijos para esta entidad'])
    }

    // suppliers reference notes
    if (entity === 'suppliers') {
      refData.push(['', ''])
      refData.push(['── FORMATO CAMPOS CRÍTICOS ──', ''])
      refData.push(['documento_numero', 'Formatear celda como TEXTO (@) para evitar que Excel elimine ceros iniciales'])
      refData.push(['numero_cuenta', 'Formatear celda como TEXTO (@) — solo dígitos, 4-20 caracteres'])
      refData.push(['dias_entrega', 'Formatear celda como TEXTO (@) si Excel convierte a fecha'])
      refData.push(['telefono', '+593 seguido de 9 dígitos empezando en 9  (ej: +593987654321)'])
      refData.push(['documento_tipo', 'Valores permitidos: cedula, ruc, pasaporte'])
      refData.push(['cedula', '10 dígitos numéricos con algoritmo módulo 10'])
      refData.push(['ruc', '13 dígitos — persona natural: cédula+001 | empresa: tercer dígito 9'])
      refData.push(['pasaporte', '6 a 20 caracteres alfanuméricos'])
    }

    // bank_transactions reference notes
    if (entity === 'bank_transactions') {
      refData.push(['', ''])
      refData.push(['── NOTAS ──', ''])
      refData.push(['numero_cuenta', 'Debe coincidir exactamente con el número de cuenta en la hoja "IDs de referencia"'])
      refData.push(['tipo', 'Valores permitidos: income (ingreso), expense (egreso)'])
      refData.push(['monto', 'Número mayor a 0 (ej: 150.50)'])
      refData.push(['categoria', 'Debe coincidir exactamente con el nombre de la categoría en la hoja "IDs de referencia"'])
      refData.push(['fecha', 'OBLIGATORIO. Formato YYYY-MM-DD (ej: 2024-01-15)'])
      refData.push(['es_fijo', 'Solo: true o false (default: false)'])
    }

    // Ecuador-specific rules for customers
    if (entity === 'customers') {
      refData.push(['', ''])
      refData.push(['── REGLAS ECUADOR ──', ''])
      refData.push(['telefono', '+593 + 9 dígitos empezando en 9  (ej: +593991234567)'])
      refData.push(['numero_id (cédula)', '10 dígitos numéricos con algoritmo módulo 10'])
      refData.push(['numero_id (ruc)', '13 dígitos — persona natural: cédula+001 | empresa: tercer dígito 9 | público: 6'])
      refData.push(['numero_id (pasaporte)', '6 a 20 caracteres alfanuméricos'])
      refData.push(['es_empresa', 'Solo: true o false'])
      refData.push(['cliente_desde', 'OBLIGATORIO. Formato YYYY-MM-DD (ej: 2024-01-15)'])
      refData.push(['tipo_cliente / etiqueta', 'Debe coincidir exactamente con el nombre en tu catálogo (hoja IDs de referencia)'])
    }

    // Add field hints
    refData.push(['', ''])
    refData.push(['NOTAS DE CAMPOS', ''])
    def.fields.forEach((f) => {
      if (f.hint) refData.push([f.label, f.hint])
    })
    refData.push(['', ''])
    refData.push(['Campos obligatorios (*)', def.fields.filter((f) => f.required).map((f) => f.label).join(', ')])
    refData.push(['Formato fechas', 'YYYY-MM-DD (ej: 2026-03-15)'])
    refData.push(['Formato booleanos', 'true o false'])
    refData.push(['Máximo de filas', '5,000 por importación'])

    const refSheet = XLSX.utils.aoa_to_sheet(refData)
    refSheet['!cols'] = [{ wch: 28 }, { wch: 60 }]

    // ── Sheet 3: IDs de referencia ─────────────────────────────────────────
    const idSheet = await buildRefIdSheet(entity, companyId)

    // ── Workbook ───────────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, dataSheet, 'Datos')
    XLSX.utils.book_append_sheet(wb, refSheet, 'Referencia')
    XLSX.utils.book_append_sheet(wb, idSheet, 'IDs de referencia')

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="lumio_plantilla_${entity}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('GET /api/import/template:', err)
    return NextResponse.json({ error: 'Error generando plantilla' }, { status: 500 })
  }
}

// ── Build reference ID sheet ───────────────────────────────────────────────

async function buildRefIdSheet(entity: EntityType, companyId: string): Promise<XLSX.WorkSheet> {
  const rows: string[][] = []

  async function fetchTable(table: string, cols: string[], label: string) {
    rows.push([`── ${label} ──`])
    rows.push(cols)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabaseAdmin as any)
        .from(table)
        .select(cols.join(', '))
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(500)
      ;(data ?? []).forEach((row: Record<string, unknown>) => {
        rows.push(cols.map((c) => String(row[c] ?? '')))
      })
    } catch {
      rows.push(['(Error al cargar datos)'])
    }
    rows.push([''])
  }

  switch (entity) {
    case 'products':
      await fetchTable('suppliers', ['id', 'name'], 'Proveedores')
      await fetchTable('product_categories', ['id', 'name', 'parent_id'], 'Categorías')
      break
    case 'customers':
      await fetchTable('sales_channels', ['id', 'name'], 'Canales de venta')
      await fetchTable('customer_types', ['id', 'name', 'color'], 'Tipos de cliente')
      await fetchTable('customer_labels', ['id', 'name', 'color'], 'Etiquetas de cliente')
      break
    case 'sales':
      await fetchTable('customers', ['id', 'full_name', 'email'], 'Clientes')
      await fetchTable('sales_channels', ['id', 'name'], 'Canales')
      await fetchTable('branches', ['id', 'name'], 'Sucursales')
      break
    case 'sale_items':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: salesData } = await (supabaseAdmin as any)
        .from('sales')
        .select('id, sale_date, customer_id')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('sale_date', { ascending: false })
        .limit(200)
      rows.push(['── Ventas (últimas 200) ──'])
      rows.push(['id', 'fecha_venta', 'customer_id'])
      ;(salesData ?? []).forEach((s: Record<string, unknown>) => {
        rows.push([String(s.id ?? ''), String(s.sale_date ?? ''), String(s.customer_id ?? '')])
      })
      rows.push([''])
      await fetchTable('products', ['id', 'name', 'sku'], 'Productos')
      break
    case 'bank_transactions': {
      // bank_accounts has bank_name (not name) — needs a custom query
      rows.push(['── Cuentas bancarias ──'])
      rows.push(['id', 'bank_name', 'account_type', 'account_number'])
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: baData } = await (supabaseAdmin as any)
          .from('bank_accounts')
          .select('id, bank_name, account_type, account_number')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('bank_name', { ascending: true })
          .limit(500)
        ;(baData ?? []).forEach((r: Record<string, unknown>) => {
          rows.push([
            String(r.id ?? ''),
            String(r.bank_name ?? ''),
            String(r.account_type ?? ''),
            String(r.account_number ?? ''),
          ])
        })
      } catch {
        rows.push(['(Error al cargar cuentas bancarias)'])
      }
      rows.push([''])
      await fetchTable('bank_transaction_categories', ['id', 'name', 'type'], 'Categorías de transacciones')
      break
    }
    case 'inventory_movements':
      await fetchTable('products', ['id', 'name', 'sku'], 'Productos')
      break
    default:
      rows.push(['No hay referencias necesarias para esta entidad.'])
  }

  if (rows.length === 0) {
    rows.push(['No hay referencias necesarias para esta entidad.'])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 38 }, { wch: 30 }, { wch: 30 }, { wch: 20 }]
  return ws
}
