import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ENTITY_DEFS, type EntityType } from '@/lib/import/entityConfig'
import { buildContext, parseFileToRows } from '@/lib/import/buildContext'
import { validateAndTransform } from '@/lib/import/rowProcessor'
import { toLocalISO } from '@/lib/dateUtils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      entityType: EntityType
      mapping: Record<string, string>
      fileData: string
      skipDuplicates?: boolean
      fileName?: string
    }

    const { entityType, mapping, fileData, skipDuplicates = false, fileName = '' } = body

    if (!entityType || !ENTITY_DEFS[entityType]) {
      return NextResponse.json({ error: 'Entidad inválida' }, { status: 400 })
    }
    if (!fileData) {
      return NextResponse.json({ error: 'Sin datos de archivo' }, { status: 400 })
    }

    // Validar tamaño antes de decodificar (base64 ~= 4/3 del original)
    if (fileData.length > 14_000_000) {
      return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 400 })
    }

    // Validar magic bytes
    const raw = Buffer.from(fileData, 'base64')
    const isCsv  = raw[0] === 0xef || raw[0] < 0x80
    const isXlsx = raw[0] === 0x50 && raw[1] === 0x4b
    const isXls  = raw[0] === 0xd0 && raw[1] === 0xcf
    if (!isCsv && !isXlsx && !isXls) {
      return NextResponse.json({ error: 'Formato de archivo no permitido. Solo se aceptan .xlsx, .xls o .csv' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role, is_pulse_admin')
      .eq('id', user.id)
      .single()

    const canImport = userData?.role === 'admin' || userData?.is_pulse_admin
    if (!canImport) {
      return NextResponse.json({ error: 'Solo administradores pueden importar datos' }, { status: 403 })
    }
    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })
    }

    const companyId = userData.company_id

    // Parse file
    let rows: Record<string, string>[]
    try {
      rows = parseFileToRows(fileData, mapping)
    } catch (e) {
      return NextResponse.json({ error: `Error leyendo archivo: ${(e as Error).message}` }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'El archivo no contiene datos' }, { status: 400 })
    }
    if (rows.length > 5000) {
      return NextResponse.json({ error: 'Máximo 5,000 filas por importación' }, { status: 400 })
    }

    // Create import_log with status='processing'
    const { data: logRow } = await supabaseAdmin
      .from('import_logs')
      .insert({
        company_id:   companyId,
        imported_by:  user.id,
        entity_type:  entityType,
        file_name:    fileName || `import_${entityType}`,
        total_rows:   rows.length,
        success_rows: 0,
        error_rows:   0,
        status:       'processing',
        errors:       [],
        imported_ids: [],
      })
      .select('id')
      .single()

    const importLogId = logRow?.id ?? null

    // Build context (entidad `customers`: validateAndTransform → validateCustomer con
    // { requireEmail: false, requireRegisteredSince: false } vía validateCustomerImportOptions)
    const ctx = await buildContext(supabaseAdmin as Parameters<typeof buildContext>[0], companyId, entityType)

    // Process rows
    let successCount = 0
    const errorList: { row: number; message: string }[] = []
    const importedIds: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      try {
        const result = await validateAndTransform(entityType, rows[i], ctx)

        // Skip duplicates if requested
        const hasDupWarning = result.warnings.some((w) => w.includes('ya existe') || w.includes('ya está registrado'))
        if (skipDuplicates && hasDupWarning) {
          continue
        }

        // Insert the row
        const insertedId = await insertRow(entityType, result.data, ctx, companyId)
        if (insertedId) {
          importedIds.push(insertedId)
          successCount++

          // Post-insert side effects
          await handlePostInsert(entityType, insertedId, result.data, ctx, companyId)

          // Refresh context for newly created items (for chained imports)
          updateContext(entityType, insertedId, result.data, ctx)
        }
      } catch (e) {
        errorList.push({ row: rowNum, message: (e as Error).message })
      }
    }

    // Determine final status
    const finalStatus =
      errorList.length === 0
        ? 'success'
        : successCount === 0
          ? 'failed'
          : 'partial'

    // Update import_log
    if (importLogId) {
      await supabaseAdmin
        .from('import_logs')
        .update({
          success_rows:  successCount,
          error_rows:    errorList.length,
          status:        finalStatus,
          errors:        errorList,
          imported_ids:  importedIds,
          completed_at:  new Date().toISOString(),
        })
        .eq('id', importLogId)
    }

    // Recalcular snapshots automáticamente si se importaron entidades que afectan el dashboard
    const ENTITIES_THAT_AFFECT_DASHBOARD: EntityType[] = [
      'sales', 'sale_items', 'bank_transactions', 'ad_campaigns',
    ]
    if (successCount > 0 && ENTITIES_THAT_AFFECT_DASHBOARD.includes(entityType)) {
      // Fire and forget — no bloqueamos la respuesta, Supabase ejecuta en DB
      void supabaseAdmin.rpc('recalculate_all_snapshots', { p_company_id: companyId })
    }

    return NextResponse.json({
      importLogId,
      success:    successCount,
      total:      rows.length,
      errors:     errorList,
      status:     finalStatus,
      recalculated: successCount > 0 && ENTITIES_THAT_AFFECT_DASHBOARD.includes(entityType),
    })

  } catch (err) {
    console.error('POST /api/import/execute:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ── Insert a single row ────────────────────────────────────────────────────

async function insertRow(
  entity: EntityType,
  data: Record<string, unknown>,
  _ctx: Parameters<typeof validateAndTransform>[2],
  _companyId: string
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabaseAdmin as any)
    .from(ENTITY_DEFS[entity].table)
    .insert(data)
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return inserted?.id ?? null
}

// ── Post-insert side effects ───────────────────────────────────────────────

async function handlePostInsert(
  entity: EntityType,
  insertedId: string,
  data: Record<string, unknown>,
  ctx: Parameters<typeof validateAndTransform>[2],
  companyId: string
) {
  // Products: create initial inventory movement if stock > 0
  if (entity === 'products') {
    const stock = Number(data.current_stock ?? 0)
    if (stock > 0 && data.product_type !== 'service') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from('inventory_movements')
        .insert({
          company_id:    companyId,
          product_id:    insertedId,
          type:          'in',
          quantity:      stock,
          reason:        'initial',
          movement_date: ctx.today,
          notes:         'Stock inicial importado desde CSV/Excel',
        })
    }
  }

  // Bank accounts: set current_balance = initial_balance
  if (entity === 'bank_accounts') {
    const initial = Number(data.initial_balance ?? 0)
    if (initial > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseAdmin as any)
        .from('bank_accounts')
        .update({ current_balance: initial })
        .eq('id', insertedId)
    }
  }
}

// ── Update in-memory context after insert ─────────────────────────────────
// So later rows in the same batch can reference just-inserted rows

function updateContext(
  entity: EntityType,
  insertedId: string,
  data: Record<string, unknown>,
  ctx: Parameters<typeof validateAndTransform>[2]
) {
  switch (entity) {
    case 'suppliers':
      if (data.name) ctx.suppliersMap[String(data.name).toLowerCase()] = insertedId
      break
    case 'product_categories':
      if (data.name) ctx.categoriesMap[String(data.name).toLowerCase()] = insertedId
      break
    case 'sales_channels':
      if (data.name) ctx.channelsMap[String(data.name).toLowerCase()] = insertedId
      break
    case 'branches':
      if (data.name) ctx.branchesMap[String(data.name).toLowerCase()] = insertedId
      break
    case 'customer_types':
      if (data.name) ctx.customerTypesMap[String(data.name).toLowerCase()] = insertedId
      break
    case 'customer_labels':
      if (data.name) ctx.customerLabelsMap[String(data.name).toLowerCase()] = insertedId
      break
    case 'products':
      if (data.sku)  ctx.productsMapBySku[String(data.sku).toLowerCase()] = insertedId
      if (data.name) ctx.productsMapByName[String(data.name).toLowerCase()] = insertedId
      if (data.sku)  ctx.existingSkus.add(String(data.sku).toLowerCase())
      break
    case 'customers':
      if (data.email)  ctx.customersMapByEmail[String(data.email).toLowerCase()] = insertedId
      if (data.tax_id) ctx.customersMapByTax[String(data.tax_id)] = insertedId
      if (data.email)  ctx.existingEmails.add(String(data.email).toLowerCase())
      if (data.tax_id) ctx.existingTaxIds.add(String(data.tax_id))
      break
    case 'bank_accounts':
      if (data.account_number) {
        ctx.bankAccountsMap[String(data.account_number)] = insertedId
        ctx.existingBankAcctNums.add(String(data.account_number))
      }
      break
    case 'sales': {
      const email = String(ctx.customersMapByEmail[String(data.customer_id ?? '')] ?? '')
      const date  = String(data.sale_date ?? '')
      if (date) ctx.salesMap[`${date}|${email}`] = insertedId
      break
    }
  }
}

// Needed for ad_campaigns — suppress unused import warning
void toLocalISO
