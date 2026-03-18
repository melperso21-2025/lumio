import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { type, companyId, rows, channels, categories } =
      await request.json()

    const supabase = await createClient()

    // 1. Verificar auth y permisos
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('role, is_pulse_admin, company_id')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin' && !userData?.is_pulse_admin) {
      return NextResponse.json(
        { error: 'Sin permisos para importar datos' },
        { status: 403 }
      )
    }

    if (
      userData?.company_id !== companyId &&
      !userData?.is_pulse_admin
    ) {
      return NextResponse.json(
        { error: 'Sin permisos para esta empresa' },
        { status: 403 }
      )
    }

    // 2. Limitar filas
    if (rows.length > 1000) {
      return NextResponse.json(
        { error: 'Máximo 1,000 filas por importación' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    let success = 0
    const errors: { row: number; message: string }[] = []

    // ── IMPORTAR VENTAS ──────────────────────────────────────
    if (type === 'sales') {
      const channelsMap: Record<string, string> = {}
      if (channels) {
        channels.forEach((c: { id: string; name: string }) => {
          channelsMap[c.name.toLowerCase().trim()] = c.id
        })
      }

      const validStatuses = ['cerrada', 'revision', 'contacto', 'anulada']
      const statusMap: Record<string, string> = {
        cerrada: 'closed',
        revision: 'review',
        contacto: 'contact',
        anulada: 'cancelled',
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        const saleDate = row[0]?.trim()
        if (!saleDate || !/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
          errors.push({
            row: rowNum,
            message: `Fecha inválida: "${saleDate}". Usa formato YYYY-MM-DD`,
          })
          continue
        }

        const total = parseFloat(row[1]?.trim() || '')
        if (isNaN(total) || total < 0) {
          errors.push({
            row: rowNum,
            message: `Total inválido: "${row[1]}". Debe ser un número positivo`,
          })
          continue
        }

        const discount = parseFloat(row[2]?.trim() || '0') || 0
        const cost = parseFloat(row[3]?.trim() || '0') || 0
        const lpp = parseInt(row[4]?.trim() || '1') || 1
        const channelName = row[5]?.trim().toLowerCase()
        const channelId = channelName ? channelsMap[channelName] : null
        const statusRaw = row[6]?.trim().toLowerCase()
        const status =
          statusRaw && validStatuses.includes(statusRaw)
            ? statusMap[statusRaw]
            : 'closed'
        const notes = row[7]?.trim() || null

        const { error: insertError } = await supabase.from('sales').insert({
          company_id: companyId,
          sale_date: saleDate,
          gross_total: total,
          discount_amount: discount,
          production_cost: cost,
          lines_per_order: lpp,
          channel_id: channelId || null,
          status,
          notes,
        })

        if (insertError) {
          errors.push({ row: rowNum, message: insertError.message })
        } else {
          success++
        }
      }
    }

    // ── IMPORTAR CLIENTES ────────────────────────────────────
    else if (type === 'customers') {
      const validTypes = ['retail', 'wholesale', 'occasional', 'b2b']
      const labelMap: Record<string, string> = {
        vip: 'vip',
        frecuente: 'frequent',
        nuevo: 'new',
        recuperar: 'recovery',
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        const fullName = row[0]?.trim()
        if (!fullName) {
          errors.push({
            row: rowNum,
            message: 'El nombre es obligatorio',
          })
          continue
        }

        const phone = row[1]?.trim() || null
        const email = row[2]?.trim() || null
        const typeRaw = row[3]?.trim().toLowerCase()
        const customerType = validTypes.includes(typeRaw) ? typeRaw : 'retail'
        const labelRaw = row[4]?.trim().toLowerCase()
        const label = labelMap[labelRaw] ?? 'new'
        const registeredSince = row[5]?.trim()
        const validDate =
          registeredSince && /^\d{4}-\d{2}-\d{2}$/.test(registeredSince)
            ? registeredSince
            : today

        const { error: insertError } = await supabase.from('customers').insert({
          company_id: companyId,
          full_name: fullName,
          phone,
          email,
          customer_type: customerType,
          label,
          registered_since: validDate,
        })

        if (insertError) {
          errors.push({ row: rowNum, message: insertError.message })
        } else {
          success++
        }
      }
    }

    // ── IMPORTAR PRODUCTOS ───────────────────────────────────
    else if (type === 'products') {
      const categoriesMap: Record<string, string> = {}
      if (categories) {
        categories.forEach((c: { id: string; name: string }) => {
          categoriesMap[c.name.toLowerCase().trim()] = c.id
        })
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNum = i + 2

        const name = row[0]?.trim()
        if (!name) {
          errors.push({
            row: rowNum,
            message: 'El nombre del producto es obligatorio',
          })
          continue
        }

        const price = parseFloat(row[3]?.trim() || '')
        if (isNaN(price) || price <= 0) {
          errors.push({
            row: rowNum,
            message: `Precio inválido: "${row[3]}". Debe ser un número mayor a 0`,
          })
          continue
        }

        const sku = row[1]?.trim() || null
        const catName = row[2]?.trim().toLowerCase()
        const categoryId = catName ? categoriesMap[catName] : null
        const cost = parseFloat(row[4]?.trim() || '0') || 0
        const stock = parseInt(row[5]?.trim() || '0') || 0
        const minStock = parseInt(row[6]?.trim() || '0') || 0
        const leadDays = parseInt(row[7]?.trim() || '1') || 1

        const { data: inserted, error: insertError } = await supabase
          .from('products')
          .insert({
            company_id: companyId,
            name,
            sku,
            category_id: categoryId || null,
            sale_price: price,
            unit_cost: cost,
            current_stock: stock,
            min_stock_alert: minStock,
            lead_time_days: leadDays,
            is_active: true,
          })
          .select('id')
          .single()

        if (insertError) {
          errors.push({ row: rowNum, message: insertError.message })
          continue
        }

        // Si tiene stock inicial, registrar el movimiento
        if (inserted && stock > 0) {
          await supabase.from('inventory_movements').insert({
            company_id: companyId,
            product_id: inserted.id,
            type: 'in',
            quantity: stock,
            reason: 'initial',
            movement_date: today,
            notes: 'Stock importado desde CSV',
          })
        }

        success++
      }
    } else {
      return NextResponse.json(
        { error: 'Tipo de importación inválido' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success,
      errors,
      total: rows.length,
    })
  } catch (error) {
    console.error('Error en importación:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
