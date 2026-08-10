import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFileToRowsAsync } from '@/lib/import/buildContext'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { fileData: string }
    const { fileData } = body

    if (!fileData) {
      return NextResponse.json({ error: 'Sin datos de archivo' }, { status: 400 })
    }
    if (fileData.length > 14_000_000) {
      return NextResponse.json({ error: 'El archivo supera el límite de 10 MB' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Empty mapping → parseFileToRowsAsync auto-maps header→header, returning all columns
    const { fileHeaders, rows } = await parseFileToRowsAsync(fileData, {})

    return NextResponse.json({
      headers: fileHeaders,
      sample:  rows.slice(0, 5).map((r) => fileHeaders.map((h) => r[h] ?? '')),
    })
  } catch (e) {
    return NextResponse.json(
      { error: `Error leyendo archivo: ${(e as Error).message}` },
      { status: 400 }
    )
  }
}
