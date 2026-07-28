import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { companyId, weekNumber, year, reason } = (await request.json()) as {
      companyId: string
      weekNumber: number
      year: number
      reason?: string
    }

    if (!companyId || !weekNumber || !year) {
      return NextResponse.json(
        { error: 'Parámetros incompletos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    // Solo el admin de la empresa puede solicitar corrección para su empresa
    if (userData?.company_id !== companyId) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Verificar que el insight exista — no tiene sentido pedir corrección si no hay nada
    const { data: insight } = await supabase
      .from('ai_insights')
      .select('id')
      .eq('company_id', companyId)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .maybeSingle()

    if (!insight) {
      return NextResponse.json(
        { error: 'No existe análisis para esta semana.' },
        { status: 404 }
      )
    }

    // Verificar que no haya ya una solicitud pendiente o aprobada para esta semana
    const { data: existingRequest } = await supabase
      .from('insight_requests')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            'Ya tienes una solicitud de corrección pendiente para esta semana.',
        },
        { status: 409 }
      )
    }

    const { error } = await supabase.from('insight_requests').insert({
      company_id: companyId,
      week_number: weekNumber,
      year: year,
      requested_by: user.id,
      reason: reason?.trim() || null,
      status: 'pending',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creando solicitud de corrección:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
