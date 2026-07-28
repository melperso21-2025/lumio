import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('user_company_memberships')
    .select('company_id, role, is_default, companies(id, name)')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const companies = (data ?? []).map((m) => ({
    company_id: m.company_id,
    role:       m.role,
    is_default: m.is_default,
    name:       (m.companies as unknown as { id: string; name: string } | null)?.name ?? '',
  }))

  return NextResponse.json({ companies })
}
