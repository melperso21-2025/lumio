import type { SupabaseClient } from '@supabase/supabase-js'

// ── validateSupplier ──────────────────────────────────────────────────────
// Declared here (before the functions it uses) as a forward reference stub.
// The real implementation is at the bottom of this file.
// We use a late-binding approach: exported as a named export below.

export interface SupplierValidationResult {
  valid: boolean
  errors: Record<string, string>
  data?: {
    name:                  string
    first_name:            string | null
    last_name:             string | null
    is_company:            boolean
    id_type:               string
    tax_id:                string
    phone:                 string
    email:                 string
    address:               string | null
    bank_name:             string | null
    bank_account:          string | null
    account_type:          string | null
    bank_tax_id:           string | null
    default_lead_time_days: number | null
    payment_terms:         string | null
  }
}

// ── Phone — Ecuador ────────────────────────────────────────────────────────
// Acepta:
//   • Móviles: local 9 dígitos empezando con 9  (ej. 0999123456 → local=999123456)
//   • Fijos:   local 9 dígitos empezando con 2-7 (ej. 0222341234 → local=222341234)
//              (código de área 2 dígitos: 02,03,04,05,06,07 → al quitar el 0 quedan 9 dígitos)

export function validatePhone(phone: string): {
  valid: boolean; error?: string; formatted?: string
} {
  if (!phone) return { valid: true }
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('593')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits
  if (local.length === 9 && /^[2-79]/.test(local))
    return { valid: true, formatted: '+593' + local }
  return {
    valid: false,
    error: 'Teléfono inválido. Móvil: 09XXXXXXXX · Fijo: 0XX-XXXXXXX (área 02-07)',
  }
}

// ── Cédula Ecuador (módulo 10) ─────────────────────────────────────────────

export function validateCedula(cedula: string): {
  valid: boolean; error?: string
} {
  const clean = cedula.replace(/\D/g, '')
  if (clean.length !== 10)
    return { valid: false, error: 'La cédula debe tener 10 dígitos' }

  const province = parseInt(clean.slice(0, 2), 10)
  if (province < 1 || province > 24)
    return { valid: false, error: 'Provincia inválida (primeros 2 dígitos: 01-24)' }

  const third = parseInt(clean[2], 10)
  if (third >= 6)
    return { valid: false, error: 'Cédula inválida (tercer dígito debe ser < 6)' }

  // Modulo 10 algorithm
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(clean[i], 10)
    if (i % 2 === 0) {
      digit *= 2
      if (digit >= 10) digit -= 9
    }
    sum += digit
  }
  const verifier = (10 - (sum % 10)) % 10
  if (verifier !== parseInt(clean[9], 10))
    return { valid: false, error: 'Cédula inválida (dígito verificador incorrecto)' }

  return { valid: true }
}

// ── RUC Ecuador ────────────────────────────────────────────────────────────

export function validateRUC(ruc: string): {
  valid: boolean; error?: string
} {
  const clean = ruc.replace(/\D/g, '')
  if (clean.length !== 13)
    return { valid: false, error: 'El RUC debe tener 13 dígitos' }

  const third = parseInt(clean[2], 10)

  if (third < 6) {
    // Persona natural: primeros 10 dígitos deben ser cédula válida, últimos 3 = '001'
    const cedulaResult = validateCedula(clean.slice(0, 10))
    if (!cedulaResult.valid)
      return { valid: false, error: `RUC inválido: ${cedulaResult.error}` }
    if (clean.slice(10) !== '001')
      return { valid: false, error: 'RUC de persona natural debe terminar en 001' }
  } else if (third === 6) {
    // Entidad pública — validación estructural OK
  } else if (third === 9) {
    // Empresa privada/extranjera — validación estructural OK
  } else {
    return { valid: false, error: 'RUC inválido (tercer dígito debe ser 0-5, 6 o 9)' }
  }

  return { valid: true }
}

// ── Pasaporte ──────────────────────────────────────────────────────────────

export function validatePassport(passport: string): {
  valid: boolean; error?: string
} {
  if (!passport) return { valid: false, error: 'El número de pasaporte es requerido' }
  const clean = passport.trim()
  if (clean.length < 6 || clean.length > 20)
    return { valid: false, error: 'El pasaporte debe tener entre 6 y 20 caracteres' }
  if (!/^[a-zA-Z0-9]+$/.test(clean))
    return { valid: false, error: 'El pasaporte solo puede contener letras y números' }
  return { valid: true }
}

// ── Tax ID — dispatcher según tipo ────────────────────────────────────────

export function validateTaxId(
  taxId: string,
  idType: 'cedula' | 'ruc' | 'pasaporte'
): { valid: boolean; error?: string } {
  if (!taxId) return { valid: false, error: 'El número de identificación es requerido' }
  switch (idType) {
    case 'cedula':    return validateCedula(taxId)
    case 'ruc':       return validateRUC(taxId)
    case 'pasaporte': return validatePassport(taxId)
  }
}

// ── Catalog validation (async) ─────────────────────────────────────────────

export async function validateCatalogValue(
  supabase: SupabaseClient,
  table: 'customer_types' | 'customer_labels',
  name: string,
  companyId: string
): Promise<{ valid: boolean; id?: string; error?: string }> {
  if (!name) return { valid: true }
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name)
    .is('deleted_at', null)
    .eq('is_active', true)
    .single()
  if (!data) return { valid: false, error: `"${name}" no existe en el catálogo` }
  return { valid: true, id: data.id }
}

// ── Boolean parsing ────────────────────────────────────────────────────────

export function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === null || value === undefined || value === '') return null
  const str = String(value).toLowerCase().trim()
  if (['true', '1', 'yes', 'si', 'sí', 'empresa'].includes(str)) return true
  if (['false', '0', 'no', 'personal'].includes(str)) return false
  return null
}

// ── Date validation ────────────────────────────────────────────────────────

export function validateDate(value: string): {
  valid: boolean; error?: string; parsed?: Date
} {
  if (!value) return { valid: false, error: 'La fecha es requerida' }
  const s = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
    return { valid: false, error: 'Formato de fecha inválido, usa YYYY-MM-DD' }
  const d = new Date(s + 'T00:00:00')
  if (isNaN(d.getTime()))
    return { valid: false, error: 'Fecha inválida' }
  return { valid: true, parsed: d }
}

// ── UUID check helper ──────────────────────────────────────────────────────

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// ── Customer validation result ─────────────────────────────────────────────

export interface CustomerValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
  data?: Record<string, unknown>
}

// ── Product validation result ──────────────────────────────────────────────

export interface ProductValidationResult {
  valid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
  data?: Record<string, unknown>
}

// ── Full customer validation ───────────────────────────────────────────────
// Accepts catalog values as names (import) or UUIDs (forms/API).
// When values are UUIDs, catalog lookup is skipped — trust the existing ID.

/** Opciones de `validateCustomer()` para importación masiva. */
export const validateCustomerImportOptions = {
  requireEmail: false,
  requireRegisteredSince: false,
  requirePhone: false,
} as const

// Every field is validated unconditionally — all errors are collected before returning.
// There are no early returns within the validation logic; only a single final check.
export async function validateCustomer(
  row: Record<string, unknown>,
  companyId: string,
  supabase: SupabaseClient,
  options?: { requireEmail?: boolean; requireRegisteredSince?: boolean; requirePhone?: boolean }
): Promise<CustomerValidationResult> {
  const errors:   Record<string, string> = {}
  const warnings: Record<string, string> = {}
  const requireEmail = options?.requireEmail ?? true
  const requireRegisteredSince = options?.requireRegisteredSince ?? true
  const requirePhone = options?.requirePhone ?? true

  // full_name
  const full_name = String(row.full_name ?? '').trim()
  if (!full_name) {
    errors.full_name = 'El nombre completo es obligatorio'
  } else if (full_name.length < 2) {
    errors.full_name = 'El nombre debe tener al menos 2 caracteres'
  }

  // email
  const emailRaw = String(row.email ?? '').trim()
  if (requireEmail) {
    if (!emailRaw) {
      errors.email = 'El email es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      errors.email = 'El email no tiene un formato válido'
    }
  } else if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    errors.email = 'El email no tiene un formato válido'
  }

  // phone
  const phone = String(row.phone ?? '').trim()
  if (!phone) {
    if (requirePhone) errors.phone = 'El teléfono es obligatorio'
  } else {
    const phoneResult = validatePhone(phone)
    if (!phoneResult.valid) errors.phone = phoneResult.error!
  }

  // id_type
  const id_type = String(row.id_type ?? '').trim().toLowerCase()
  const validIdTypes = ['cedula', 'ruc', 'pasaporte']
  if (!id_type) {
    errors.id_type = 'El tipo de identificación es obligatorio'
  } else if (!validIdTypes.includes(id_type)) {
    errors.id_type = 'Tipo de ID inválido. Valores: cedula, ruc, pasaporte'
  }

  // tax_id
  const tax_id = String(row.tax_id ?? '').trim()
  if (!tax_id) {
    errors.tax_id = 'El número de identificación es requerido'
  } else if (tax_id === '9999999999') {
    // Placeholder: válido sin algoritmo de cédula
  } else if (validIdTypes.includes(id_type)) {
    const taxResult = validateTaxId(tax_id, id_type as 'cedula' | 'ruc' | 'pasaporte')
    if (!taxResult.valid) errors.tax_id = taxResult.error!
  }

  // customer_type (optional) — skip lookup if already a UUID
  let customer_type_id: string | null = null
  const customer_type_raw = String(row.customer_type ?? '').trim()
  if (customer_type_raw) {
    if (isUUID(customer_type_raw)) {
      customer_type_id = customer_type_raw
    } else {
      const catResult = await validateCatalogValue(supabase, 'customer_types', customer_type_raw, companyId)
      if (!catResult.valid) {
        errors.customer_type = `Tipo de cliente "${customer_type_raw}" no existe en tu catálogo. Ve a Configuración → Clientes para crearlo.`
      } else {
        customer_type_id = catResult.id ?? null
      }
    }
  }

  // label (optional) — skip lookup if already a UUID
  let label_id: string | null = null
  const label_raw = String(row.label ?? '').trim()
  if (label_raw) {
    if (isUUID(label_raw)) {
      label_id = label_raw
    } else {
      const labelResult = await validateCatalogValue(supabase, 'customer_labels', label_raw, companyId)
      if (!labelResult.valid) {
        errors.label = `Etiqueta "${label_raw}" no existe en tu catálogo. Ve a Configuración → Clientes para crearlo.`
      } else {
        label_id = labelResult.id ?? null
      }
    }
  }

  // is_company
  let is_company: boolean | null = null
  if (row.is_company !== undefined && row.is_company !== null && row.is_company !== '') {
    is_company = parseBoolean(row.is_company)
    if (is_company === null)
      errors.is_company = 'is_company solo acepta: true, false, si, no'
  }

  // registered_since
  const registered_since_raw = String(row.registered_since ?? '').trim()
  let registered_since: string | null = null
  if (!registered_since_raw && requireRegisteredSince) {
    errors.registered_since = 'cliente_desde es obligatorio'
  } else if (registered_since_raw) {
    const dateResult = validateDate(registered_since_raw)
    if (!dateResult.valid) errors.registered_since = 'cliente_desde debe ser una fecha válida (YYYY-MM-DD)'
    else registered_since = registered_since_raw
  }

  // contact_phone (optional)
  const contact_phone_raw = String(row.contact_phone ?? '').trim()
  let contact_phone_formatted: string | null = null
  if (contact_phone_raw) {
    const cpResult = validatePhone(contact_phone_raw)
    if (!cpResult.valid) errors.contact_phone = cpResult.error!
    else contact_phone_formatted = cpResult.formatted ?? null
  }

  const valid = Object.keys(errors).length === 0
  if (!valid) return { valid: false, errors, warnings }

  const phoneFormatted: string | null = phone ? (validatePhone(phone).formatted ?? phone) : null
  const emailForData: string | null = requireEmail ? emailRaw : (emailRaw || null)

  return {
    valid: true,
    errors,
    warnings,
    data: {
      full_name,
      email: emailForData,
      phone:             phoneFormatted,
      id_type:           id_type || null,
      tax_id,
      customer_type:     customer_type_id,
      label:             label_id,
      is_company:        is_company ?? false,
      registered_since,
      contact_phone:     contact_phone_formatted,
      address:           String(row.address       ?? '').trim() || null,
      contact_name:      String(row.contact_name  ?? '').trim() || null,
      contact_email:     String(row.contact_email ?? '').trim() || null,
    },
  }
}

// ── Full product validation ────────────────────────────────────────────────

export async function validateProduct(
  row: Record<string, unknown>,
  _companyId: string,
  _supabase: SupabaseClient
): Promise<ProductValidationResult> {
  const errors:   Record<string, string> = {}
  const warnings: Record<string, string> = {}

  // name
  const name = String(row.name ?? '').trim()
  if (!name) errors.name = 'El nombre del producto es obligatorio'

  // product_type
  const product_type = String(row.product_type ?? 'product').trim().toLowerCase()
  if (!['product', 'service'].includes(product_type))
    errors.product_type = 'Tipo inválido. Valores: product, service'

  // unit_type
  const unit_type = String(row.unit_type ?? '').trim().toLowerCase()
  const validUnitTypes = ['unit', 'weight', 'volume', 'length', 'area']
  if (unit_type && !validUnitTypes.includes(unit_type))
    errors.unit_type = 'Tipo de unidad inválido. Valores: unit, weight, volume, length, area'

  // sale_price
  const sale_price_raw = row.sale_price
  const sale_price = Number(sale_price_raw)
  if (sale_price_raw !== undefined && sale_price_raw !== null && sale_price_raw !== '') {
    if (isNaN(sale_price) || sale_price < 0)
      errors.sale_price = 'El precio de venta debe ser un número >= 0'
  }

  // unit_cost
  const unit_cost_raw = row.unit_cost
  const unit_cost = Number(unit_cost_raw)
  if (unit_cost_raw !== undefined && unit_cost_raw !== null && unit_cost_raw !== '') {
    if (isNaN(unit_cost) || unit_cost < 0)
      errors.unit_cost = 'El costo unitario debe ser un número >= 0'
  }

  // current_stock
  const current_stock_raw = row.current_stock
  const current_stock = Number(current_stock_raw)
  if (current_stock_raw !== undefined && current_stock_raw !== null && current_stock_raw !== '') {
    if (isNaN(current_stock) || current_stock < 0)
      errors.current_stock = 'El stock debe ser un número >= 0'
  }

  // min_stock_alert
  const min_stock_raw = row.min_stock_alert
  const min_stock_alert = Number(min_stock_raw)
  if (min_stock_raw !== undefined && min_stock_raw !== null && min_stock_raw !== '') {
    if (isNaN(min_stock_alert) || min_stock_alert < 0)
      errors.min_stock_alert = 'El stock mínimo debe ser un número >= 0'
  }

  // is_perishable
  let is_perishable: boolean | null = null
  if (row.is_perishable !== undefined && row.is_perishable !== null && row.is_perishable !== '') {
    is_perishable = parseBoolean(row.is_perishable)
    if (is_perishable === null)
      errors.is_perishable = 'Valor inválido para "es_perecedero". Usa: true o false'
  }

  const valid = Object.keys(errors).length === 0
  if (!valid) return { valid: false, errors, warnings }

  return {
    valid: true,
    errors,
    warnings,
    data: {
      name,
      product_type,
      unit_type:       unit_type || 'unit',
      sale_price:      isNaN(sale_price)     ? undefined : sale_price,
      unit_cost:       isNaN(unit_cost)      ? 0         : unit_cost,
      current_stock:   isNaN(current_stock)  ? 0         : current_stock,
      min_stock_alert: isNaN(min_stock_alert)? 0         : min_stock_alert,
      is_perishable:   is_perishable ?? false,
    },
  }
}

// ── validateAccountNumber ─────────────────────────────────────────────────
// Solo dígitos 0-9, mínimo 4, máximo 20 caracteres.
// Campo opcional: si está vacío devuelve valid=true.

export function validateAccountNumber(num: string): {
  valid: boolean; error?: string
} {
  if (!num) return { valid: true }
  if (!/^\d{4,20}$/.test(num)) {
    return {
      valid: false,
      error: 'El número de cuenta solo puede contener dígitos numéricos (mínimo 4, máximo 20)',
    }
  }
  return { valid: true }
}

// ── validateBankTransaction ────────────────────────────────────────────────
// Validates a bank transaction row.
// Accepts both resolved IDs (from forms) and raw strings (from import).
// For import use: pass account_id already resolved, or pass account_number
// and have the caller look it up via context map before calling this.

export interface BankTransactionValidationResult {
  valid: boolean
  errors: Record<string, string>
  data?: {
    account_id:   string
    type:         'income' | 'expense'
    amount:       number
    category:     string
    tx_date:      string
    is_fixed:     boolean
    concept?:     string
  }
}

export async function validateBankTransaction(
  row: Record<string, unknown>,
  companyId: string,
  supabase: SupabaseClient,
): Promise<BankTransactionValidationResult> {
  const errors: Record<string, string> = {}

  // ── account_id / account_number ─────────────────────────────────────────
  const account_id = String(row.account_id ?? '').trim()
  if (!account_id) {
    errors.account_id = 'La cuenta bancaria es obligatoria'
  }

  // If a raw account_number was provided alongside (e.g. from an import preview),
  // validate its format before any lookup.
  const account_number_raw = String(row.account_number ?? '').trim()
  if (account_number_raw) {
    const anResult = validateAccountNumber(account_number_raw)
    if (!anResult.valid) errors.account_number = anResult.error!
  }

  // ── type ────────────────────────────────────────────────────────────────
  const type = String(row.type ?? '').trim().toLowerCase()
  if (!type) {
    errors.type = 'El tipo es obligatorio (income o expense)'
  } else if (type !== 'income' && type !== 'expense') {
    errors.type = `Tipo inválido: "${type}". Solo se permite: income, expense`
  }

  // ── amount ──────────────────────────────────────────────────────────────
  const amountRaw = row.amount
  const amount    = Number(amountRaw)
  if (amountRaw === undefined || amountRaw === null || amountRaw === '') {
    errors.amount = 'El monto es obligatorio'
  } else if (isNaN(amount) || amount <= 0) {
    errors.amount = 'El monto debe ser un número mayor a 0'
  }

  // ── category ────────────────────────────────────────────────────────────
  const categoryName = String(row.category ?? '').trim()
  if (!categoryName) {
    errors.category = 'La categoría es obligatoria'
  } else {
    // Verify category exists in the company's catalog
    const { data: catRow } = await supabase
      .from('bank_transaction_categories')
      .select('id, type')
      .eq('company_id', companyId)
      .ilike('name', categoryName)
      .is('deleted_at', null)
      .eq('is_active', true)
      .maybeSingle()

    if (!catRow) {
      errors.category = `Categoría "${categoryName}" no existe en tu catálogo. Ve a Configuración → Finanzas para crearla.`
    } else if (
      type === 'income'  && catRow.type === 'expense' ||
      type === 'expense' && catRow.type === 'income'
    ) {
      errors.category = `La categoría "${categoryName}" no es compatible con el tipo "${type}"`
    }
  }

  // ── tx_date ─────────────────────────────────────────────────────────────
  const tx_date = String(row.tx_date ?? '').trim()
  if (!tx_date) {
    errors.tx_date = 'La fecha es obligatoria (formato YYYY-MM-DD)'
  } else {
    const dateResult = validateDate(tx_date)
    if (!dateResult.valid) {
      errors.tx_date = 'Fecha inválida. Usa el formato YYYY-MM-DD'
    }
  }

  // ── is_fixed ────────────────────────────────────────────────────────────
  let is_fixed: boolean | null = null
  if (row.is_fixed !== undefined && row.is_fixed !== null && row.is_fixed !== '') {
    is_fixed = parseBoolean(row.is_fixed)
    if (is_fixed === null) {
      errors.is_fixed = 'es_fijo inválido. Usa: true o false'
    }
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors }

  return {
    valid: true,
    errors,
    data: {
      account_id,
      type:    type as 'income' | 'expense',
      amount,
      category: categoryName,
      tx_date,
      is_fixed: is_fixed ?? false,
      concept:  String(row.concept ?? '').trim() || undefined,
    },
  }
}

// ── validateSupplier ──────────────────────────────────────────────────────
// Validates a supplier row synchronously (no DB lookups needed).
// Accumulates all errors before returning.

export function validateSupplier(
  row: Record<string, unknown>,
  _companyId: string = ''
): SupplierValidationResult {
  const errors: Record<string, string> = {}

  // ── is_company ───────────────────────────────────────────────────────────
  const is_company =
    row.is_company === true || row.is_company === false
      ? (row.is_company as boolean)
      : (parseBoolean(row.is_company) ?? true)

  // ── name / first_name / last_name ────────────────────────────────────────
  const name_raw       = String(row.name ?? '').trim()
  const first_name_raw = String(row.first_name ?? '').trim()
  const last_name_raw  = String(row.last_name ?? '').trim()
  let resolvedName = ''

  if (is_company) {
    if (!name_raw) errors.name = 'El nombre de la empresa es obligatorio'
    else resolvedName = name_raw
  } else {
    if (!first_name_raw) errors.first_name = 'El nombre es obligatorio'
    if (!last_name_raw)  errors.last_name  = 'El apellido es obligatorio'
    if (first_name_raw && last_name_raw) {
      resolvedName = `${first_name_raw} ${last_name_raw}`
    }
  }

  // ── id_type ──────────────────────────────────────────────────────────────
  const id_type = String(row.id_type ?? '').trim().toLowerCase()
  const validIdTypes = ['cedula', 'ruc', 'pasaporte']
  if (!id_type) {
    errors.id_type = 'El tipo de documento es obligatorio'
  } else if (!validIdTypes.includes(id_type)) {
    errors.id_type = `Tipo de documento inválido. Valores: cedula, ruc, pasaporte`
  }

  // ── tax_id ───────────────────────────────────────────────────────────────
  const tax_id = String(row.tax_id ?? '').trim()
  if (!tax_id) {
    errors.tax_id = 'El número de identificación es obligatorio'
  } else if (validIdTypes.includes(id_type)) {
    const taxResult = validateTaxId(tax_id, id_type as 'cedula' | 'ruc' | 'pasaporte')
    if (!taxResult.valid) errors.tax_id = taxResult.error!
  }

  // ── phone ────────────────────────────────────────────────────────────────
  const phone = String(row.phone ?? '').trim()
  if (!phone) {
    errors.phone = 'El teléfono es obligatorio'
  } else {
    const phoneResult = validatePhone(phone)
    if (!phoneResult.valid) errors.phone = phoneResult.error!
  }

  // ── email ────────────────────────────────────────────────────────────────
  const email = String(row.email ?? '').trim()
  if (!email) {
    errors.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = `Email "${email}" no tiene formato válido`
  }

  // ── bank_account (optional, solo dígitos 4-20) ──────────────────────────
  const bank_account = String(row.bank_account ?? '').trim()
  if (bank_account) {
    const anResult = validateAccountNumber(bank_account)
    if (!anResult.valid) errors.bank_account = anResult.error!
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors }

  const phoneFormatted = validatePhone(phone).formatted ?? phone

  return {
    valid: true,
    errors,
    data: {
      name:                  resolvedName,
      first_name:            is_company ? null : (first_name_raw || null),
      last_name:             is_company ? null : (last_name_raw  || null),
      is_company,
      id_type,
      tax_id,
      phone:                 phoneFormatted,
      email,
      address:               String(row.address ?? '').trim()      || null,
      bank_name:             String(row.bank_name ?? '').trim()    || null,
      bank_account:          bank_account                          || null,
      account_type:          String(row.account_type ?? '').trim() || null,
      bank_tax_id:           String(row.bank_tax_id ?? '').trim()  || null,
      default_lead_time_days: row.default_lead_time_days
        ? (Number(row.default_lead_time_days) || null)
        : null,
      payment_terms: String(row.payment_terms ?? '').trim() || null,
    },
  }
}
