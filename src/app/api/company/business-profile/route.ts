import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) return NextResponse.json({ error: 'Sin empresa' }, { status: 403 })

    const { data: company } = await supabase
      .from('companies')
      .select('name, sector, business_description, main_customer_type, avg_monthly_revenue_range')
      .eq('id', userData.company_id)
      .single()

    return NextResponse.json({ company })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) return NextResponse.json({ error: 'Sin empresa' }, { status: 403 })
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await request.json() as {
      business_description?: string
      main_customer_type?: string
      avg_monthly_revenue_range?: string
    }

    const validCustomerTypes = ['b2c', 'b2b', 'mixed']
    const validRevenueRanges = ['lt5k', '5k_20k', '20k_100k', 'gt100k']

    if (body.main_customer_type && !validCustomerTypes.includes(body.main_customer_type)) {
      return NextResponse.json({ error: 'Tipo de cliente inválido' }, { status: 400 })
    }
    if (body.avg_monthly_revenue_range && !validRevenueRanges.includes(body.avg_monthly_revenue_range)) {
      return NextResponse.json({ error: 'Rango de facturación inválido' }, { status: 400 })
    }

    const update: Record<string, string> = {}
    if (body.business_description !== undefined) update.business_description = body.business_description.trim()
    if (body.main_customer_type !== undefined) update.main_customer_type = body.main_customer_type
    if (body.avg_monthly_revenue_range !== undefined) update.avg_monthly_revenue_range = body.avg_monthly_revenue_range

    const { error } = await supabase
      .from('companies')
      .update(update)
      .eq('id', userData.company_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
