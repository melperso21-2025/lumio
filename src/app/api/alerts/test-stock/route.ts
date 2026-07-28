import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend, FROM } from '@/lib/email/resend'
import { stockAlertHtml, stockAlertText, type LowStockProduct } from '@/lib/email/templates/stockAlert'

// POST — envía el email de alerta de stock al usuario autenticado (solo admin)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role, email, full_name')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id)
    return NextResponse.json({ error: 'Sin empresa asignada' }, { status: 403 })

  if (!['admin', 'manager'].includes(userData.role ?? ''))
    return NextResponse.json({ error: 'Solo admin o manager pueden enviar alertas' }, { status: 403 })

  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name')
    .eq('id', userData.company_id)
    .single()

  const { data: rawProducts } = await supabaseAdmin
    .from('products')
    .select('name, sku, current_stock, min_stock_alert, unit_label, product_categories!left(name)')
    .eq('company_id', userData.company_id)
    .is('deleted_at', null)
    .eq('is_active', true)
    .eq('product_type', 'product')
    .not('min_stock_alert', 'is', null)
    .gt('min_stock_alert', 0)

  const alertProducts: LowStockProduct[] = (rawProducts ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => (p.current_stock ?? 0) <= (p.min_stock_alert ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      name:            p.name,
      sku:             p.sku ?? null,
      current_stock:   p.current_stock ?? 0,
      min_stock_alert: p.min_stock_alert ?? 0,
      unit_label:      p.unit_label ?? null,
      category_name:   p.product_categories?.name ?? null,
    }))
    .sort((a: LowStockProduct, b: LowStockProduct) => a.current_stock - b.current_stock)

  if (alertProducts.length === 0)
    return NextResponse.json({ ok: true, message: 'No hay productos con stock bajo actualmente.' })

  const companyName = company?.name ?? 'Tu empresa'
  const toEmail = userData.email ?? user.email

  if (!toEmail)
    return NextResponse.json({ error: 'Sin email configurado' }, { status: 400 })

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      [toEmail],
    subject: `⚠️ ${alertProducts.length} producto${alertProducts.length !== 1 ? 's' : ''} con stock bajo — ${companyName}`,
    html:    stockAlertHtml(alertProducts, companyName),
    text:    stockAlertText(alertProducts, companyName),
  })

  if (error) {
    console.error('[alerts/test-stock]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Email enviado a ${toEmail} con ${alertProducts.length} producto${alertProducts.length !== 1 ? 's' : ''}.`,
    count: alertProducts.length,
  })
}
