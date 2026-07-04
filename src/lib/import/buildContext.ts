/**
 * Pre-fetches all lookup maps needed for import processing.
 * Used by both validate and execute routes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProcessContext } from './rowProcessor'
import type { EntityType } from './entityConfig'
import { toLocalISO } from '@/lib/dateUtils'

function toLowerMap(
  rows: { id: string; [key: string]: unknown }[],
  keyField: string
): Record<string, string> {
  const map: Record<string, string> = {}
  rows.forEach((r) => {
    const k = String(r[keyField] ?? '').toLowerCase().trim()
    if (k) map[k] = r.id
  })
  return map
}

export async function buildContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  companyId: string,
  entity: EntityType
): Promise<ProcessContext> {
  const today = toLocalISO(new Date())

  // Helper: fetch a table with soft-delete filter
  // customers puede tener miles de registros — usa limit alto y paginación si supera la página
  async function fetch(table: string, select: string, limit = 2000) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from(table)
      .select(select)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .limit(limit)
    return data ?? []
  }

  // Para customers cargamos hasta 20k para soportar bases grandes
  async function fetchAllCustomers(select: string) {
    const pageSize = 2000
    const pages: unknown[][] = []
    let from = 0
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('customers')
        .select(select)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .range(from, from + pageSize - 1)
      const page = data ?? []
      pages.push(page)
      if (page.length < pageSize) break
      from += pageSize
      if (from >= 20000) break  // techo de seguridad
    }
    return pages.flat()
  }

  // Always fetch the entity's dependencies
  const [
    suppliersData,
    categoriesData,
    channelsData,
    customersData,
    customerTypesData,
    customerLabelsData,
    branchesData,
    productsData,
    bankAccountsData,
    bankTxCategoriesData,
    salesData,
  ] = await Promise.all([
    fetch('suppliers', 'id, name'),
    fetch('product_categories', 'id, name'),
    fetch('sales_channels', 'id, name'),
    fetchAllCustomers('id, email, tax_id'),
    fetch('customer_types', 'id, name'),
    fetch('customer_labels', 'id, name'),
    fetch('branches', 'id, name'),
    fetch('products', 'id, name, sku'),
    fetch('bank_accounts', 'id, account_number'),
    fetch('bank_transaction_categories', 'id, name'),
    entity === 'sale_items'
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('sales')
          .select('id, sale_date, external_ref, customer_id, customers(email)')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .limit(5000)
          .then((r: { data: unknown[] | null }) => r.data ?? [])
      : Promise.resolve([]),
  ])

  // sales map por "date|email" (fallback) y por external_ref (preferido)
  const salesMap: Record<string, string> = {}
  const salesMapByRef: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(salesData as any[]).forEach((s: any) => {
    const email = (s.customers?.email ?? '').toLowerCase().trim()
    const date  = s.sale_date ?? ''
    if (email && date) salesMap[`${date}|${email}`] = s.id
    const ref = String(s.external_ref ?? '').trim()
    if (ref) salesMapByRef[ref.toLowerCase()] = s.id
  })

  // bank accounts map: account_number → id
  const bankAccountsMap: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(bankAccountsData as any[]).forEach((a: any) => {
    const num = String(a.account_number ?? '').trim()
    if (num) bankAccountsMap[num] = a.id
  })

  // bank transaction categories map: name_lower → id
  const bankTxCategoriesMap = toLowerMap(bankTxCategoriesData, 'name')

  // existing dedup sets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingEmails    = new Set<string>((customersData as any[]).map((c: any) => String(c.email ?? '').toLowerCase()))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingTaxIds    = new Set<string>((customersData as any[]).map((c: any) => String(c.tax_id ?? '')))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingSkus      = new Set<string>((productsData as any[]).map((p: any) => String(p.sku ?? '').toLowerCase()).filter(Boolean))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingBankAcctNums = new Set<string>((bankAccountsData as any[]).map((a: any) => String(a.account_number ?? '')).filter(Boolean))

  // customers by email and tax_id
  const customersMapByEmail: Record<string, string> = {}
  const customersMapByTax: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(customersData as any[]).forEach((c: any) => {
    const email = String(c.email ?? '').toLowerCase().trim()
    const tax   = String(c.tax_id ?? '').trim()
    if (email) customersMapByEmail[email] = c.id
    if (tax)   customersMapByTax[tax]     = c.id
  })

  // products map by sku and name
  const productsMapBySku: Record<string, string> = {}
  const productsMapByName: Record<string, string> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(productsData as any[]).forEach((p: any) => {
    const sku  = String(p.sku ?? '').toLowerCase().trim()
    const name = String(p.name ?? '').toLowerCase().trim()
    if (sku)  productsMapBySku[sku]   = p.id
    if (name) productsMapByName[name] = p.id
  })

  return {
    supabase,
    companyId,
    today,
    suppliersMap:       toLowerMap(suppliersData, 'name'),
    categoriesMap:      toLowerMap(categoriesData, 'name'),
    channelsMap:        toLowerMap(channelsData, 'name'),
    customersMapByEmail,
    customersMapByTax,
    customerTypesMap:   toLowerMap(customerTypesData, 'name'),
    customerLabelsMap:  toLowerMap(customerLabelsData, 'name'),
    branchesMap:        toLowerMap(branchesData, 'name'),
    productsMapBySku,
    productsMapByName,
    bankAccountsMap,
    bankTxCategoriesMap,
    salesMap,
    salesMapByRef,
    existingEmails,
    existingTaxIds,
    existingSkus,
    existingBankAcctNums,
  }
}

// ── Parse base64 file to rows ─────────────────────────────────────────────

export function parseFileToRows(
  fileDataBase64: string,
  mapping: Record<string, string>
): Record<string, string>[] {
  // Lazy import of xlsx (server-side only)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')

  const buf  = Buffer.from(fileDataBase64, 'base64')
  const wb   = XLSX.read(buf, { type: 'buffer', cellDates: false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
    dateNF: 'yyyy-mm-dd',  // preserva formato ISO en celdas detectadas como fecha
  }) as string[][]

  if (raw.length < 2) return []
  const fileHeaders = (raw[0] as string[]).map((h) => String(h ?? '').trim())

  return raw.slice(1).filter((r) => r.some((c) => c !== '')).map((row) => {
    const mapped: Record<string, string> = {}
    // mapping: systemFieldLabel → fileColumnHeader
    Object.entries(mapping).forEach(([systemLabel, fileHeader]) => {
      const colIdx = fileHeaders.indexOf(fileHeader)
      if (colIdx !== -1) {
        mapped[systemLabel] = String(row[colIdx] ?? '').trim()
      }
    })
    return mapped
  })
}
