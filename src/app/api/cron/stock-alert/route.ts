import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend, FROM } from '@/lib/email/resend'
import { stockAlertHtml, stockAlertText, type LowStockProduct } from '@/lib/email/templates/stockAlert'

// Vercel Cron: diariamente a las 13:00 UTC (8:00 AM Ecuador)
// Configurado en vercel.json

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .is('deleted_at', null)

    if (!companies?.length) return NextResponse.json({ ok: true, processed: 0 })

    async function processCompany(company: { id: string; name: string }): Promise<boolean> {
      const { data: rawProducts } = await supabaseAdmin
        .from('products')
        .select('name, sku, current_stock, min_stock_alert, unit_label, product_categories!left(name)')
        .eq('company_id', company.id)
        .is('deleted_at', null)
        .eq('is_active', true)
        .eq('product_type', 'product')
        .not('min_stock_alert', 'is', null)
        .gt('min_stock_alert', 0)

      // Filtrar en JS: stock actual <= mínimo (Supabase no soporta comparación entre columnas)
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

      if (alertProducts.length === 0) return false

      const { data: recipients } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('company_id', company.id)
        .in('role', ['admin', 'manager'])
        .is('deleted_at', null)
        .not('email', 'is', null)

      const emails = (recipients ?? []).map((r) => r.email).filter(Boolean) as string[]
      if (!emails.length) return false

      await resend.emails.send({
        from:    FROM,
        to:      emails,
        subject: `⚠️ ${alertProducts.length} producto${alertProducts.length !== 1 ? 's' : ''} con stock bajo — ${company.name}`,
        html:    stockAlertHtml(alertProducts, company.name),
        text:    stockAlertText(alertProducts, company.name),
      })

      return true
    }

    const results = await Promise.all(companies.map(processCompany))
    const totalEmails = results.filter(Boolean).length

    return NextResponse.json({ ok: true, processed: totalEmails })
  } catch (err) {
    console.error('[cron/stock-alert]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
