/**
 * Shared row-processing logic for validate and execute routes.
 * Each entity has:
 *  - validate(row, context): returns error string | null
 *  - transform(row, context): returns DB-ready object or throws
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EntityType } from './entityConfig'
import {
  validatePhone,
  parseBoolean as parseBooleanLib,
  validateSupplier,
  validateSupplierImportOptions,
  validateCustomer,
  validateCustomerImportOptions,
} from '@/lib/validations'

// ── Context passed to each row processor ──────────────────────────────────

export interface ProcessContext {
  supabase: SupabaseClient
  companyId: string
  today: string       // ISO date YYYY-MM-DD
  // lookup maps (pre-fetched)
  suppliersMap: Record<string, string>    // name_lower → id
  categoriesMap: Record<string, string>   // name_lower → id
  channelsMap: Record<string, string>     // name_lower → id
  customersMapByEmail: Record<string, string> // email_lower → id
  customersMapByTax: Record<string, string>   // tax_id → id
  customerTypesMap: Record<string, string>    // name_lower → id
  customerLabelsMap: Record<string, string>   // name_lower → id
  branchesMap: Record<string, string>     // name_lower → id
  productsMapBySku: Record<string, string>    // sku_lower → id
  productsMapByName: Record<string, string>   // name_lower → id
  bankAccountsMap: Record<string, string>         // account_number → id
  bankTxCategoriesMap: Record<string, string>     // name_lower → id
  salesMap: Record<string, string>                // "date|email" → sale_id
  salesMapByRef: Record<string, string>           // external_ref_lower → sale_id
  existingEmails: Set<string>
  existingTaxIds: Set<string>
  existingSkus: Set<string>
  existingBankAcctNums: Set<string>
}

export interface ProcessedRow {
  data: Record<string, unknown>
  warnings: string[]
}

// ── Helpers ───────────────────────────────────────────────────────────────

function parseBool(v: string | undefined): boolean {
  if (!v) return false
  return parseBooleanLib(v) ?? false
}

function parseDate(v: string | undefined): string | null {
  if (!v) return null
  const s = v.toString().trim()
  // YYYY-MM-DD (ISO) — formato estándar de la plantilla
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // DD/MM/YYYY o D/M/YYYY — formato Ecuador/LatAm
  const dmy4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy4) {
    const d = parseInt(dmy4[1], 10)
    const m = parseInt(dmy4[2], 10)
    // Si el primer número > 12, solo puede ser día (DD/MM/YYYY)
    // Si el segundo número > 12, solo puede ser mes en posición 2 (MM/DD/YYYY es imposible)
    // Ecuador usa DD/MM/YYYY, lo tomamos como DD/MM/YYYY si d > 12 o m <= 12
    if (d > 12 || (d <= 12 && m <= 12)) {
      // Asumir DD/MM/YYYY si d > 12, sino ambiguo → asumir DD/MM/YYYY (convención Ecuador)
      const dd = String(d).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      return `${dmy4[3]}-${mm}-${dd}`
    }
  }
  // MM/DD/YYYY — formato US (solo si mes ≤ 12 y no aplica DD/MM)
  const mdy4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy4) {
    const mm = mdy4[1].padStart(2, '0')
    const dd = mdy4[2].padStart(2, '0')
    return `${mdy4[3]}-${mm}-${dd}`
  }
  // DD/MM/YY o MM/DD/YY — año 2 dígitos
  const short2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (short2) {
    const yy   = parseInt(short2[3], 10)
    const yyyy = yy >= 0 && yy <= 30 ? 2000 + yy : 1900 + yy
    const p1   = parseInt(short2[1], 10)
    const p2   = parseInt(short2[2], 10)
    // Si p1 > 12 → DD/MM, sino asumir DD/MM (Ecuador)
    const dd = p1 > 12 ? String(p1).padStart(2, '0') : String(p1).padStart(2, '0')
    const mm = p1 > 12 ? String(p2).padStart(2, '0') : String(p2).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  // DD-MM-YYYY con guiones
  const dmyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyDash) {
    const d = parseInt(dmyDash[1], 10)
    const m = parseInt(dmyDash[2], 10)
    if (d > 12 || m <= 12) {
      return `${dmyDash[3]}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  // Excel serial number
  const n = Number(s)
  if (!isNaN(n) && n > 40000) {
    return XLSX_serial_to_date(n)
  }
  return null
}

function XLSX_serial_to_date(serial: number): string {
  const utc_days  = Math.floor(serial - 25569)
  const utc_value = utc_days * 86400 * 1000
  const d = new Date(utc_value)
  const yyyy = d.getUTCFullYear()
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd   = String(d.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseNum(v: string | undefined): number | null {
  if (!v && v !== '0') return null
  const n = parseFloat(String(v).trim().replace(/,/g, '.'))
  return isNaN(n) ? null : n
}

function parseNumInt(v: string | undefined): number | null {
  const n = parseNum(v)
  return n !== null ? Math.round(n) : null
}

function normalizeSupplierAccountType(
  raw: unknown
): { account_type: string | undefined; error?: string } {
  if (raw == null || String(raw).trim() === '') {
    return { account_type: undefined }
  }
  const s = String(raw).toLowerCase().trim()
  if (['savings', 'ahorro', 'ahorros'].includes(s)) return { account_type: 'savings' }
  if (['checking', 'cheking', 'corriente', 'cheque'].includes(s)) {
    return { account_type: 'checking' }
  }
  return {
    account_type: undefined,
    error: "tipo_cuenta inválido: usa 'savings' o 'checking'",
  }
}

function normalizeSupplierBankAccount(raw: unknown): string | undefined {
  if (raw == null) return undefined
  const s = String(raw).trim()
  return s === '' ? undefined : s
}

function normalizeSupplierPaymentTerms(raw: unknown): string | undefined {
  if (raw == null) return undefined
  const t = String(raw).trim()
  if (t === '') return undefined
  const lower = t.toLowerCase().replace(/\s+/g, ' ').trim()
  if (['contado', 'cash', '0'].includes(lower)) return 'cash'
  if (['15', '15d', '15 dias'].includes(lower)) return '15d'
  if (['30', '30d', '30 dias'].includes(lower)) return '30d'
  if (['60', '60d'].includes(lower)) return '60d'
  if (['90', '90d'].includes(lower)) return '90d'
  return 'other'
}

// ── Per-entity processors ─────────────────────────────────────────────────

export async function validateAndTransform(
  entity: EntityType,
  row: Record<string, string>,
  ctx: ProcessContext
): Promise<ProcessedRow> {
  const warnings: string[] = []

  switch (entity) {

    // ── suppliers ───────────────────────────────────────────────────────
    case 'suppliers': {
      const isCompanyRaw = row['es_empresa']?.trim()
      const is_company   = isCompanyRaw ? (parseBooleanLib(isCompanyRaw) ?? true) : true

      const accountTypeNorm = normalizeSupplierAccountType(row['tipo_cuenta'])
      if (accountTypeNorm.error) {
        throw new Error(accountTypeNorm.error)
      }

      const rowData: Record<string, unknown> = {
        is_company,
        name:       is_company ? (row['nombre_empresa']?.trim() || undefined) : undefined,
        first_name: is_company ? undefined : (row['nombre']?.trim()   || undefined),
        last_name:  is_company ? undefined : (row['apellido']?.trim() || undefined),
        id_type:    row['documento_tipo']?.trim()?.toLowerCase(),
        tax_id:     row['documento_numero']?.trim(),
        phone:      row['telefono']?.trim(),
        email:      row['email']?.trim(),
        address:    row['direccion']?.trim() || undefined,
        bank_name:  row['banco_nombre']?.trim()   || undefined,
        bank_account: normalizeSupplierBankAccount(row['numero_cuenta']),
        account_type: accountTypeNorm.account_type,
        bank_tax_id:  row['ruc_cuenta']?.trim()   || undefined,
        default_lead_time_days: row['dias_entrega']?.trim() || undefined,
        payment_terms: normalizeSupplierPaymentTerms(row['terminos_pago']),
      }

      const result = validateSupplier(rowData, ctx.companyId, validateSupplierImportOptions)
      if (!result.valid) {
        throw new Error(Object.values(result.errors).join(' · '))
      }

      // Dedup warning
      const resolvedName = result.data!.name.toLowerCase()
      if (ctx.suppliersMap[resolvedName]) {
        warnings.push(`Proveedor "${result.data!.name}" ya existe`)
      }

      return {
        data: {
          company_id: ctx.companyId,
          ...result.data,
          is_active: true,
        },
        warnings,
      }
    }

    // ── product_categories ──────────────────────────────────────────────
    case 'product_categories': {
      const name = row['nombre']?.trim()
      if (!name) throw new Error('El campo "nombre" es obligatorio')
      const parentName = row['categoria_padre']?.trim().toLowerCase()
      const parent_id  = parentName ? ctx.categoriesMap[parentName] ?? null : null
      if (parentName && !parent_id) {
        warnings.push(`Categoría padre "${row['categoria_padre']}" no encontrada, se ignorará`)
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return {
        data: { company_id: ctx.companyId, name, slug, parent_id },
        warnings,
      }
    }

    // ── sales_channels ──────────────────────────────────────────────────
    case 'sales_channels': {
      const name = row['nombre']?.trim()
      if (!name) throw new Error('El campo "nombre" es obligatorio')
      if (ctx.channelsMap[name.toLowerCase()]) {
        warnings.push(`Canal "${name}" ya existe`)
      }
      return { data: { company_id: ctx.companyId, name }, warnings }
    }

    // ── branches ──────────────────────────────────────────────────────
    case 'branches': {
      const name = row['nombre']?.trim()
      if (!name) throw new Error('El campo "nombre" es obligatorio')
      if (ctx.branchesMap[name.toLowerCase()]) {
        warnings.push(`Sucursal "${name}" ya existe`)
      }
      return { data: { company_id: ctx.companyId, name }, warnings }
    }

    // ── customer_types ──────────────────────────────────────────────────
    case 'customer_types': {
      const name = row['nombre']?.trim()
      if (!name) throw new Error('El campo "nombre" es obligatorio')
      return {
        data: {
          company_id: ctx.companyId,
          name,
          color: row['color']?.trim() || '#888780',
          is_active: true,
        },
        warnings,
      }
    }

    // ── customer_labels ─────────────────────────────────────────────────
    case 'customer_labels': {
      const name = row['nombre']?.trim()
      if (!name) throw new Error('El campo "nombre" es obligatorio')
      return {
        data: {
          company_id: ctx.companyId,
          name,
          color: row['color']?.trim() || '#888780',
          is_active: true,
        },
        warnings,
      }
    }

    // ── products ────────────────────────────────────────────────────────
    case 'products': {
      const name = row['nombre']?.trim()
      if (!name) throw new Error('El campo "nombre" es obligatorio')
      const salePrice = parseNum(row['precio_venta'])
      if (!salePrice || salePrice <= 0) throw new Error('"precio_venta" debe ser mayor a 0')

      const sku = row['sku']?.trim() || null
      if (sku && ctx.existingSkus.has(sku.toLowerCase())) {
        warnings.push(`SKU "${sku}" ya existe en el catálogo`)
      }

      const supplierName = row['proveedor_nombre']?.trim().toLowerCase()
      const supplier_id  = supplierName ? ctx.suppliersMap[supplierName] ?? null : null
      if (supplierName && !supplier_id) warnings.push(`Proveedor "${row['proveedor_nombre']}" no encontrado`)

      const catName    = row['categoria_nombre']?.trim().toLowerCase()
      const category_id= catName ? ctx.categoriesMap[catName] ?? null : null
      if (catName && !category_id) warnings.push(`Categoría "${row['categoria_nombre']}" no encontrada`)

      const product_type = row['tipo_producto']?.trim() || 'product'
      const isService    = product_type === 'service'

      return {
        data: {
          company_id:      ctx.companyId,
          name,
          sku,
          sale_price:      salePrice,
          unit_cost:       parseNum(row['costo_unitario']) ?? 0,
          supplier_id,
          category_id,
          product_type,
          unit_type:       isService ? null : (row['tipo_unidad']?.trim() || 'unit'),
          unit_label:      isService ? null : (row['unidad']?.trim() || 'unidad'),
          current_stock:   isService ? 0 : (parseNum(row['stock_inicial']) ?? 0),
          min_stock_alert: isService ? 0 : (parseNum(row['stock_minimo']) ?? 0),
          lead_time_days:  isService ? null : (parseNumInt(row['dias_reposicion']) ?? 1),
          is_perishable:   isService ? false : parseBool(row['es_perecedero']),
          expiry_date:     (!isService && parseBool(row['es_perecedero'])) ? parseDate(row['fecha_caducidad']) : null,
          is_active:       true,
        },
        warnings,
      }
    }

    // ── customers ───────────────────────────────────────────────────────
    case 'customers': {
      const isCompanyCell = row['es_empresa'] !== undefined
        ? String(row['es_empresa']).trim()
        : ''
      const regParsed = parseDate(row['cliente_desde'] ?? undefined)

      const rowData: Record<string, unknown> = {
        full_name: row['nombre_completo']?.trim(),
        email:     row['email']?.trim(),
        phone:     row['telefono']?.trim(),
        id_type:   row['tipo_id']?.trim().toLowerCase(),
        tax_id:    row['numero_id']?.trim(),
        customer_type: row['tipo_cliente']?.trim(),
        label:     row['etiqueta']?.trim(),
        // Si parseDate no pudo convertir el valor, se deja undefined para no disparar
        // validación de formato en validateCustomer (el campo es opcional en importación)
        registered_since: regParsed ?? undefined,
        contact_phone: row['contacto_telefono']?.trim(),
        address:    row['direccion']?.trim(),
        contact_name: row['contacto_nombre']?.trim(),
        contact_email: row['contacto_email']?.trim(),
      }
      if (isCompanyCell !== '') {
        rowData.is_company = isCompanyCell
      }

      const v = await validateCustomer(
        rowData,
        ctx.companyId,
        ctx.supabase,
        validateCustomerImportOptions
      )
      if (!v.valid) {
        throw new Error(Object.values(v.errors).join(' · '))
      }
      const d = v.data!

      const emailStr = d.email != null && d.email !== '' ? String(d.email) : ''
      if (emailStr && ctx.existingEmails.has(emailStr.toLowerCase())) {
        warnings.push(`Email "${emailStr}" ya está registrado`)
      }
      const taxIdStr = d.tax_id != null && d.tax_id !== '' ? String(d.tax_id) : ''
      if (taxIdStr && ctx.existingTaxIds.has(taxIdStr)) {
        warnings.push(`ID "${taxIdStr}" ya está registrado`)
      }

      return {
        data: {
          company_id:        ctx.companyId,
          full_name:         d.full_name,
          email:             d.email,
          phone:             d.phone,
          tax_id:            d.tax_id,
          id_type:           d.id_type,
          customer_type:     d.customer_type,
          label:             d.label,
          is_company:        d.is_company,
          address:           d.address,
          registered_since:  d.registered_since,
          contact_name:      d.contact_name,
          contact_phone:     d.contact_phone,
          contact_email:     d.contact_email,
        },
        warnings,
      }
    }

    // ── bank_accounts ───────────────────────────────────────────────────
    case 'bank_accounts': {
      const bank_name = row['nombre_banco']?.trim()
      if (!bank_name) throw new Error('"nombre_banco" es obligatorio')
      const accountNum = row['numero_cuenta']?.trim()
      if (accountNum && ctx.existingBankAcctNums.has(accountNum)) {
        warnings.push(`Cuenta "${accountNum}" ya existe`)
      }
      return {
        data: {
          company_id:      ctx.companyId,
          bank_name,
          account_type:    row['tipo_cuenta']?.trim() || null,
          account_number:  accountNum || null,
          initial_balance: parseNum(row['saldo_inicial']) ?? 0,
          current_balance: parseNum(row['saldo_inicial']) ?? 0,
          is_active:       true,
        },
        warnings,
      }
    }

    // ── bank_transactions ───────────────────────────────────────────────
    case 'bank_transactions': {
      // Accumulate ALL errors before throwing
      const rowErrors: string[] = []

      // account_number → account_id
      const accountNum = row['numero_cuenta']?.trim()
      let account_id: string | null = null
      if (!accountNum) {
        rowErrors.push('"numero_cuenta" es obligatorio')
      } else if (!/^\d{4,20}$/.test(accountNum)) {
        rowErrors.push(`Número de cuenta inválido: "${accountNum}" — solo dígitos, entre 4 y 20 caracteres`)
      } else {
        account_id = ctx.bankAccountsMap[accountNum] ?? null
        if (!account_id) rowErrors.push(`Cuenta "${accountNum}" no encontrada`)
      }

      // type
      const type = row['tipo']?.trim().toLowerCase()
      if (!type) {
        rowErrors.push('"tipo" es obligatorio (income o expense)')
      } else if (type !== 'income' && type !== 'expense') {
        rowErrors.push(`tipo inválido: "${type}". Solo se permite: income, expense`)
      }

      // amount
      const amount = parseNum(row['monto'])
      if (amount === null) {
        rowErrors.push('"monto" es obligatorio')
      } else if (amount <= 0) {
        rowErrors.push('"monto" debe ser mayor a 0')
      }

      // category
      const categoryName = row['categoria']?.trim()
      let resolvedCategory: string | null = null
      if (!categoryName) {
        rowErrors.push('"categoria" es obligatoria')
      } else {
        const catId = ctx.bankTxCategoriesMap[categoryName.toLowerCase()]
        if (!catId) {
          rowErrors.push(`Categoría "${categoryName}" no existe en tu catálogo. Ve a Configuración → Finanzas para crearla.`)
        } else {
          resolvedCategory = categoryName
        }
      }

      // tx_date
      const tx_date = parseDate(row['fecha'])
      if (!tx_date) rowErrors.push('"fecha" es obligatoria (formato YYYY-MM-DD)')

      // is_fixed
      const isFixedRaw = row['es_fijo']?.trim()
      const isFixedParsed = isFixedRaw ? parseBooleanLib(isFixedRaw) : null
      if (isFixedRaw && isFixedParsed === null)
        rowErrors.push(`es_fijo inválido: "${isFixedRaw}". Usa: true o false`)

      if (rowErrors.length > 0) throw new Error(rowErrors.join(' · '))

      return {
        data: {
          company_id: ctx.companyId,
          account_id: account_id!,
          type,
          amount: amount!,
          category:  resolvedCategory,
          concept:   row['concepto']?.trim() || null,
          tx_date:   tx_date!,
          is_fixed:  isFixedParsed ?? false,
        },
        warnings,
      }
    }

    // ── ad_campaigns ────────────────────────────────────────────────────
    case 'ad_campaigns': {
      const platform = row['plataforma']?.trim().toLowerCase()
      if (!platform) throw new Error('"plataforma" es obligatorio')

      const campaign_date = parseDate(row['fecha_campana'])
      if (!campaign_date) throw new Error('"fecha_campana" inválida')

      return {
        data: {
          company_id:         ctx.companyId,
          platform,
          campaign_date,
          campaign_name:      row['nombre_campana']?.trim() || null,
          spend:              parseNum(row['inversion']) ?? 0,
          clicks:             parseNumInt(row['clics']) ?? 0,
          reach:              parseNumInt(row['alcance']) ?? 0,
          impressions:        parseNumInt(row['impresiones']) ?? 0,
          leads_count:        parseNumInt(row['leads']) ?? 0,
          quality_leads:      parseNumInt(row['leads_calificados']) ?? 0,
          transactions:       parseNumInt(row['transacciones']) ?? 0,
          attributed_revenue: parseNum(row['ingresos_atribuidos']) ?? 0,
          // roas, ctr, cpm, etc. are generated/calculated - omitted
        },
        warnings,
      }
    }

    // ── sales ────────────────────────────────────────────────────────────
    case 'sales': {
      const sale_date = parseDate(row['fecha_venta'])
      if (!sale_date) throw new Error(
        `"fecha_venta" inválida (valor: "${row['fecha_venta'] ?? ''}") — usa YYYY-MM-DD, ej: 2026-03-15`
      )

      const customerEmail = row['email_cliente']?.trim().toLowerCase()
      if (!customerEmail) throw new Error('"email_cliente" es obligatorio')
      const customer_id = ctx.customersMapByEmail[customerEmail]
      if (!customer_id) throw new Error(`Cliente con email "${row['email_cliente']}" no encontrado`)

      const channelName = row['canal']?.trim().toLowerCase()
      const channel_id  = channelName ? ctx.channelsMap[channelName] ?? null : null
      if (channelName && !channel_id) warnings.push(`Canal "${row['canal']}" no encontrado`)

      const branchName = row['sucursal']?.trim().toLowerCase()
      const branch_id  = branchName ? ctx.branchesMap[branchName] ?? null : null
      if (branchName && !branch_id) warnings.push(`Sucursal "${row['sucursal']}" no encontrada`)

      const statusRaw = row['estado']?.trim().toLowerCase()
      const validStatuses = ['closed', 'review', 'contact', 'cancelled']
      const status = validStatuses.includes(statusRaw) ? statusRaw : 'closed'

      const external_ref = row['referencia']?.trim() || null

      return {
        data: {
          company_id:      ctx.companyId,
          sale_date,
          customer_id,
          channel_id,
          branch_id,
          status,
          external_ref,
          gross_total:     parseNum(row['total']) ?? 0,
          discount_amount: parseNum(row['descuento']) ?? 0,
          notes:           row['notas']?.trim() || null,
          // week_number and year are GENERATED columns — never insert
        },
        warnings,
      }
    }

    // ── sale_items ───────────────────────────────────────────────────────
    case 'sale_items': {
      const saleRef     = row['referencia_venta']?.trim()
      const saleDateKey = row['venta_fecha_email']?.trim()

      if (!saleRef && !saleDateKey) {
        throw new Error('Debes indicar "referencia_venta" o "venta_fecha_email" para identificar la venta')
      }

      let sale_id: string | undefined
      if (saleRef) {
        sale_id = ctx.salesMapByRef[saleRef.toLowerCase()]
        if (!sale_id) throw new Error(`Venta con referencia "${saleRef}" no encontrada`)
      } else {
        sale_id = ctx.salesMap[saleDateKey!.toLowerCase()]
        if (!sale_id) throw new Error(`Venta "${saleDateKey}" no encontrada`)
      }

      const sku = row['sku_producto']?.trim()
      if (!sku) throw new Error('"sku_producto" es obligatorio')
      const product_id = ctx.productsMapBySku[sku.toLowerCase()]
      if (!product_id) throw new Error(`Producto SKU "${sku}" no encontrado`)

      const quantity = parseNum(row['cantidad'])
      if (!quantity || quantity <= 0) throw new Error('"cantidad" debe ser mayor a 0')

      const unit_price = parseNum(row['precio_unitario'])
      if (unit_price === null || unit_price < 0) throw new Error('"precio_unitario" inválido')

      return {
        data: {
          company_id:      ctx.companyId,
          sale_id,
          product_id,
          quantity,
          unit_price,
          unit_cost:       parseNum(row['costo_unitario']) ?? 0,
          discount_amount: parseNum(row['descuento']) ?? 0,
          // subtotal is GENERATED ALWAYS — never insert
        },
        warnings,
      }
    }

    // ── inventory_movements ─────────────────────────────────────────────
    case 'inventory_movements': {
      const sku = row['sku_producto']?.trim()
      if (!sku) throw new Error('"sku_producto" es obligatorio')
      const product_id = ctx.productsMapBySku[sku.toLowerCase()]
      if (!product_id) throw new Error(`Producto SKU "${sku}" no encontrado`)

      const type = row['tipo']?.trim().toLowerCase()
      if (!['in', 'out', 'adjustment'].includes(type)) {
        throw new Error('"tipo" debe ser in, out o adjustment')
      }

      const quantity = parseNum(row['cantidad'])
      if (!quantity || quantity <= 0) throw new Error('"cantidad" debe ser mayor a 0')

      const reason = row['razon']?.trim().toLowerCase()
      const validReasons = ['purchase', 'sale', 'return', 'adjustment', 'damage', 'transfer', 'initial']
      if (!validReasons.includes(reason)) throw new Error(`"razon" inválida: ${reason}`)

      if (type === 'adjustment' && !row['notas']?.trim()) {
        throw new Error('Las notas son obligatorias para ajustes')
      }

      return {
        data: {
          company_id:    ctx.companyId,
          product_id,
          type,
          quantity,
          reason,
          movement_date: parseDate(row['fecha_movimiento']) ?? ctx.today,
          notes:         row['notas']?.trim() || null,
          batch_number:  row['numero_lote']?.trim() || null,
        },
        warnings,
      }
    }

    default:
      throw new Error(`Entidad "${entity}" no soportada`)
  }
}
