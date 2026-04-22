import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ENTITY_DEFS, type EntityType } from '@/lib/import/entityConfig'
import { buildContext, parseFileToRows } from '@/lib/import/buildContext'
import { validateAndTransform } from '@/lib/import/rowProcessor'

/** Respuesta de error con forma estable para el wizard (incl. cuando no se procesaron filas). */
function errorJson(
  message: string,
  status: 400 | 401 | 403 | 500
) {
  return NextResponse.json(
    { error: message, errors: [], valid: 0, total: 0 },
    { status }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      entityType: EntityType
      mapping: Record<string, string>
      fileData: string   // base64
    }

    const { entityType, mapping, fileData } = body
    if (!entityType || !ENTITY_DEFS[entityType]) {
      return errorJson('Entidad inválida', 400)
    }
    if (!fileData) {
      return errorJson('Sin datos de archivo', 400)
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return errorJson('No autenticado', 401)

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role, is_pulse_admin')
      .eq('id', user.id)
      .single()

    const canImport = userData?.role === 'admin' || userData?.is_pulse_admin
    if (!canImport) {
      return errorJson('Solo administradores pueden importar datos', 403)
    }
    if (!userData?.company_id) {
      return errorJson('Sin empresa asignada', 403)
    }

    const companyId = userData.company_id

    // Parse file
    let rows: Record<string, string>[]
    try {
      rows = parseFileToRows(fileData, mapping)
    } catch (e) {
      return errorJson(`Error leyendo archivo: ${(e as Error).message}`, 400)
    }

    console.log('validate request:', { entityType, rowCount: rows.length })

    if (rows.length === 0) {
      return errorJson('El archivo no contiene datos (solo encabezados o está vacío)', 400)
    }
    if (rows.length > 5000) {
      return errorJson('Máximo 5,000 filas por importación', 400)
    }

    // Build context (entidad `customers`: validateAndTransform → validateCustomer con
    // { requireEmail: false, requireRegisteredSince: false } vía validateCustomerImportOptions)
    const ctx = await buildContext(supabase, companyId, entityType)

    // Validate each row
    const errors: { row: number; field: string; message: string }[] = []
    const warnings: { row: number; message: string }[] = []
    const preview: Record<string, unknown>[] = []
    let validCount = 0

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2  // +2 because row 1 = headers
      try {
        const result = await validateAndTransform(entityType, rows[i], ctx)
        validCount++
        result.warnings.forEach((w) => warnings.push({ row: rowNum, message: w }))
        if (i < 5) preview.push(result.data)
      } catch (e) {
        errors.push({
          row: rowNum,
          field: '',
          message: (e as Error).message,
        })
      }
    }

    return NextResponse.json({
      total:      rows.length,
      valid:      validCount,
      errorCount: errors.length,
      warnCount:  warnings.length,
      errors,
      warnings,
      preview,
    })

  } catch (err) {
    console.error('POST /api/import/validate:', err)
    return errorJson('Error interno del servidor', 500)
  }
}
