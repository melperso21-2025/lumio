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

  // Paginación genérica para tablas que pueden superar max_rows (sin filtro extra)
  async function fetchAllPaged(table: string, select: string, extraFilters?: (q: unknown) => unknown) {
    const all: unknown[] = []
    const pageSize = 1000
    let offset = 0
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from(table)
        .select(select)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (extraFilters) q = extraFilters(q)
      const { data, error } = await q
      if (error || !data || data.length === 0) break
      all.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
      if (offset >= 50000) break
    }
    return all
  }

  async function fetchAllSales(select: string) {
    return fetchAllPaged('sales', select)
  }

  async function fetchAllCustomers(select: string) {
    return fetchAllPaged('customers', select)
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
    fetchAllPaged('products', 'id, name, sku'),
    fetch('bank_accounts', 'id, account_number'),
    fetch('bank_transaction_categories', 'id, name'),
    entity === 'sale_items'
      ? fetchAllSales('id, sale_date, external_ref, customer_id, customers(email)')
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

// ── Excel date helper ─────────────────────────────────────────────────────
// ExcelJS stores dates as UTC midnight. toISOString() is safe here.
function excelDateToISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Parse base64 file to rows ─────────────────────────────────────────────

export function parseFileToRows(
  fileDataBase64: string,
  mapping: Record<string, string>
): Record<string, string>[] {
  const buf = Buffer.from(fileDataBase64, 'base64')

  // Detect CSV by magic bytes (text or UTF-8 BOM). Check XLSX/ZIP first since 0x50 ('P') < 0x80.
  const isXlsxOrZip = buf[0] === 0x50 && buf[1] === 0x4b
  const isCsv = !isXlsxOrZip && (buf[0] === 0xef || buf[0] < 0x80)

  let raw: string[][]

  if (isCsv) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Papa = require('papaparse') as typeof import('papaparse')
    const text = buf.toString('utf-8').replace(/^﻿/, '') // strip BOM
    const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true })
    raw = result.data as string[][]
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExcelJS = require('exceljs') as typeof import('exceljs')
    const wb = new ExcelJS.Workbook()
    // ExcelJS.xlsx.load is async — use sync workaround via stream
    // We block here using a shared buffer approach supported by ExcelJS
    // Note: this function is called from async contexts; wrap caller if needed
    // For now we throw to force callers to use parseFileToRowsAsync
    throw new Error('Use parseFileToRowsAsync for xlsx files')
  }

  if (raw.length < 2) return []
  const fileHeaders = (raw[0] as string[]).map((h) => String(h ?? '').trim())

  return raw.slice(1).filter((r) => r.some((c) => c !== '')).map((row) => {
    const mapped: Record<string, string> = {}
    Object.entries(mapping).forEach(([systemLabel, fileHeader]) => {
      const colIdx = fileHeaders.indexOf(fileHeader)
      if (colIdx !== -1) mapped[systemLabel] = String(row[colIdx] ?? '').trim()
    })
    return mapped
  })
}

export async function parseFileToRowsAsync(
  fileDataBase64: string,
  mapping: Record<string, string>
): Promise<{ rows: Record<string, string>[]; fileHeaders: string[]; raw1: string[] }> {
  const buf = Buffer.from(fileDataBase64, 'base64')
  const isXlsxOrZip = buf[0] === 0x50 && buf[1] === 0x4b
  const isCsv = !isXlsxOrZip && (buf[0] === 0xef || buf[0] < 0x80)

  let raw: string[][]

  if (isCsv) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Papa = require('papaparse') as typeof import('papaparse')
    const text = buf.toString('utf-8').replace(/^﻿/, '')
    const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true })
    raw = result.data as string[][]
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExcelJS = require('exceljs') as typeof import('exceljs')
    const wb = new ExcelJS.Workbook()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wb.xlsx as any).load(buf)
    const ws = wb.worksheets[0]
    raw = []
    ws.eachRow((row) => {
      const cells = (row.values as unknown[]).slice(1) // index 0 is empty
      raw.push(cells.map((c) => {
        if (c === null || c === undefined) return ''
        if (typeof c === 'object' && c !== null && 'result' in c) {
          // Formula cell — use the cached result
          const r = (c as { result: unknown }).result
          if (r instanceof Date) return excelDateToISO(r)
          return r != null ? String(r) : ''
        }
        if (typeof c === 'object' && c !== null && 'text' in c) return String((c as { text: string }).text ?? '')
        if (c instanceof Date) return excelDateToISO(c)
        return String(c)
      }))
    })
  }

  if (raw.length < 2) return { rows: [], fileHeaders: [], raw1: [] }
  const fileHeaders = raw[0].map((h) => String(h ?? '').trim())

  // If the client sent an empty mapping (race condition or auto-map failure),
  // fall back to a direct 1:1 mapping so Lumio-template files still work
  // (the template uses system-label names as column headers).
  const effectiveMapping = Object.keys(mapping).length > 0
    ? mapping
    : Object.fromEntries(fileHeaders.filter(Boolean).map((h) => [h, h]))

  const rows = raw.slice(1).filter((r) => r.some((c) => c !== '')).map((row) => {
    const mapped: Record<string, string> = {}
    Object.entries(effectiveMapping).forEach(([systemLabel, fileHeader]) => {
      const colIdx = fileHeaders.indexOf(fileHeader)
      if (colIdx !== -1) mapped[systemLabel] = String(row[colIdx] ?? '').trim()
    })
    return mapped
  })

  return { rows, fileHeaders, raw1: raw[1] ?? [] }
}
