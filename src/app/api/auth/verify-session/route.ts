import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const sessionToken = request.headers.get('x-session-token')

  if (!userId || !sessionToken) {
    return NextResponse.json({ valid: false })
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('session_token')
    .eq('id', userId)
    .single()

  const valid = !!data && data.session_token === sessionToken
  return NextResponse.json({ valid })
}
