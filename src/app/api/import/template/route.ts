import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
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

    const wb = new ExcelJS.Workbook()

    // ── Sheet 1: Datos ─────────────────────────────────────────────────────
    const dataSheet = wb.addWorksheet('Datos')
    const headers = def.fields.map((f) => f.label)
    const examples = def.fields.map((f) => f.example)

    dataSheet.addRow(headers)
    dataSheet.addRow(examples)

    // Column widths
    dataSheet.columns = headers.map((h, i) => ({
      width: Math.max(h.length + (def.fields[i].required ? 2 : 0), 14),
    }))

    // Force text format for critical columns in example row
    const textFormatLabels = new Set([
      'documento_numero', 'numero_cuenta', 'dias_entrega',
      'celular', 'telefono', 'tax_id', 'numero_id',
    ])
    def.fields.forEach((f, colIdx) => {
      if (!textFormatLabels.has(f.label)) return
      const cell = dataSheet.getCell(2, colIdx + 1)
      cell.numFmt = '@'
    })

    // ── Sheet 2: Referencia ────────────────────────────────────────────────
    const refSheet = wb.addWorksheet('Referencia')
    refSheet.columns = [{ width: 28 }, { width: 60 }]

    refSheet.addRow(['Campo', 'Valores permitidos / Formato'])

    const allowedForEntity = ALLOWED_VALUES[entity] ?? []
    if (allowedForEntity.length > 0) {
      allowedForEntity.forEach(({ label, values }) => {
        refSheet.addRow([label, values.join(' | ')])
      })
    } else {
      refSheet.addRow(['—', 'No hay valores fijos para esta entidad'])
    }

    if (entity === 'suppliers') {
      refSheet.addRow(['', ''])
      refSheet.addRow(['── FORMATO CAMPOS CRÍTICOS ──', ''])
      refSheet.addRow(['documento_numero', 'Formatear celda como TEXTO (@) para evitar que Excel elimine ceros iniciales'])
      refSheet.addRow(['numero_cuenta', 'Formatear celda como TEXTO (@) — solo dígitos, 4-20 caracteres'])
      refSheet.addRow(['dias_entrega', 'Formatear celda como TEXTO (@) si Excel convierte a fecha'])
      refSheet.addRow(['telefono', '+593 seguido de 9 dígitos empezando en 9  (ej: +593987654321)'])
      refSheet.addRow(['documento_tipo', 'Valores permitidos: cedula, ruc, pasaporte'])
      refSheet.addRow(['cedula', '10 dígitos numéricos con algoritmo módulo 10'])
      refSheet.addRow(['ruc', '13 dígitos — persona natural: cédula+001 | empresa: tercer dígito 9'])
      refSheet.addRow(['pasaporte', '6 a 20 caracteres alfanuméricos'])
    }

    if (entity === 'bank_transactions') {
      refSheet.addRow(['', ''])
      refSheet.addRow(['── NOTAS ──', ''])
      refSheet.addRow(['numero_cuenta', 'Debe coincidir exactamente con el número de cuenta en la hoja "IDs de referencia"'])
      refSheet.addRow(['tipo', 'Valores permitidos: income (ingreso), expense (egreso)'])
      refSheet.addRow(['monto', 'Número mayor a 0 (ej: 150.50)'])
      refSheet.addRow(['categoria', 'Debe coincidir exactamente con el nombre de la categoría en la hoja "IDs de referencia"'])
      refSheet.addRow(['fecha', 'OBLIGATORIO. Formato YYYY-MM-DD (ej: 2024-01-15)'])
      refSheet.addRow(['es_fijo', 'Solo: true o false (default: false)'])
    }

    if (entity === 'customers') {
      refSheet.addRow(['', ''])
      refSheet.addRow(['── REGLAS ECUADOR ──', ''])
      refSheet.addRow(['celular', 'Celular Ecuador: 10 dígitos, empieza con 09  (ej: 0999123456) — opcional en importación'])
      refSheet.addRow(['telefono', 'Convencional: 6-9 dígitos con o sin código de área  (ej: 022341234) — opcional'])
      refSheet.addRow(['numero_id (cédula)', '10 dígitos numéricos con algoritmo módulo 10'])
      refSheet.addRow(['numero_id (ruc)', '13 dígitos — persona natural: cédula+001 | empresa: tercer dígito 9 | público: 6'])
      refSheet.addRow(['numero_id (pasaporte)', '6 a 20 caracteres alfanuméricos'])
      refSheet.addRow(['es_empresa', 'Solo: true o false'])
      refSheet.addRow(['cliente_desde', 'OBLIGATORIO. Formato YYYY-MM-DD (ej: 2024-01-15)'])
      refSheet.addRow(['tipo_cliente / etiqueta', 'Debe coincidir exactamente con el nombre en tu catálogo (hoja IDs de referencia)'])
    }

    refSheet.addRow(['', ''])
    refSheet.addRow(['NOTAS DE CAMPOS', ''])
    def.fields.forEach((f) => {
      if (f.hint) refSheet.addRow([f.label, f.hint])
    })
    refSheet.addRow(['', ''])
    refSheet.addRow(['Campos obligatorios (*)', def.fields.filter((f) => f.required).map((f) => f.label).join(', ')])
    refSheet.addRow(['Formato fechas', 'YYYY-MM-DD (ej: 2026-03-15)'])
    refSheet.addRow(['Formato booleanos', 'true o false'])
    refSheet.addRow(['Máximo de filas', '5,000 por importación'])

    // ── Sheet 3: IDs de referencia ─────────────────────────────────────────
    const idSheet = wb.addWorksheet('IDs de referencia')
    idSheet.columns = [{ width: 38 }, { width: 30 }, { width: 30 }, { width: 20 }]
    await buildRefIdSheet(entity, companyId, idSheet)

    const buf = await wb.xlsx.writeBuffer()

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

async function buildRefIdSheet(entity: EntityType, companyId: string, ws: ExcelJS.Worksheet) {
  async function fetchTable(table: string, cols: string[], label: string) {
    ws.addRow([`── ${label} ──`])
    ws.addRow(cols)
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
        ws.addRow(cols.map((c) => String(row[c] ?? '')))
      })
    } catch {
      ws.addRow(['(Error al cargar datos)'])
    }
    ws.addRow([''])
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
    case 'sale_items': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: salesData } = await (supabaseAdmin as any)
        .from('sales')
        .select('id, sale_date, customer_id')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('sale_date', { ascending: false })
        .limit(200)
      ws.addRow(['── Ventas (últimas 200) ──'])
      ws.addRow(['id', 'fecha_venta', 'customer_id'])
      ;(salesData ?? []).forEach((s: Record<string, unknown>) => {
        ws.addRow([String(s.id ?? ''), String(s.sale_date ?? ''), String(s.customer_id ?? '')])
      })
      ws.addRow([''])
      await fetchTable('products', ['id', 'name', 'sku'], 'Productos')
      break
    }
    case 'bank_transactions': {
      ws.addRow(['── Cuentas bancarias ──'])
      ws.addRow(['id', 'bank_name', 'account_type', 'account_number'])
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
          ws.addRow([
            String(r.id ?? ''),
            String(r.bank_name ?? ''),
            String(r.account_type ?? ''),
            String(r.account_number ?? ''),
          ])
        })
      } catch {
        ws.addRow(['(Error al cargar cuentas bancarias)'])
      }
      ws.addRow([''])
      await fetchTable('bank_transaction_categories', ['id', 'name', 'type'], 'Categorías de transacciones')
      break
    }
    case 'inventory_movements':
      await fetchTable('products', ['id', 'name', 'sku'], 'Productos')
      break
    default:
      ws.addRow(['No hay referencias necesarias para esta entidad.'])
  }

  if (ws.rowCount === 0) {
    ws.addRow(['No hay referencias necesarias para esta entidad.'])
  }
}
