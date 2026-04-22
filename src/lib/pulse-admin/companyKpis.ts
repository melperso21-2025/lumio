import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>

const PAGE = 1000

export async function getCompanyKpis(
  supabase: Client,
  companyId: string
): Promise<{
  totalSales: number
  customerCount: number
  productCount: number
  insightCount: number
}> {
  const [{ count: customerCount }, { count: productCount }, { count: insightCount }, totalSales] =
    await Promise.all([
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .is('deleted_at', null),
      supabase
        .from('ai_insights')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
      sumGrossTotalForCompany(supabase, companyId),
    ])

  return {
    totalSales,
    customerCount: customerCount ?? 0,
    productCount: productCount ?? 0,
    insightCount: insightCount ?? 0,
  }
}

async function sumGrossTotalForCompany(
  supabase: Client,
  companyId: string
): Promise<number> {
  let total = 0
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('sales')
      .select('gross_total')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .range(from, from + PAGE - 1)

    if (error) {
      console.error('sumGrossTotalForCompany', error)
      return total
    }
    const rows = data ?? []
    for (const r of rows) {
      total += Number(r.gross_total ?? 0)
    }
    if (rows.length < PAGE) break
    from += PAGE
  }
  return total
}
