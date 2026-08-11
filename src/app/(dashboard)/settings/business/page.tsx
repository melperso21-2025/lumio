import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import BusinessProfileForm from '@/components/settings/BusinessProfileForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BusinessProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) redirect('/dashboard')
  if (!['admin', 'manager'].includes(userData.role)) redirect('/dashboard')

  const { data: company } = await supabase
    .from('companies')
    .select('name, sector, business_description, main_customer_type, avg_monthly_revenue_range')
    .eq('id', userData.company_id)
    .single()

  if (!company) redirect('/dashboard')

  const isComplete = !!(
    company.business_description &&
    company.main_customer_type &&
    company.avg_monthly_revenue_range
  )

  return (
    <>
      <Topbar pageTitle="Mi negocio" pageSubtitle="Perfil para análisis de IA" />
      <div style={{ padding: '24px 28px', maxWidth: 680 }}>

        {/* Encabezado */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>✦</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-syne)', color: 'var(--text)' }}>
              Perfil del negocio
            </h1>
            {isComplete
              ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)' }}>Completo</span>
              : <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,200,66,0.12)', color: 'var(--gold)', border: '1px solid rgba(245,200,66,0.25)' }}>Pendiente</span>
            }
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Esta información le da a la IA el contexto de tu negocio para que sus análisis sean específicos y relevantes — no genéricos. Cuanto más detallada sea tu descripción, mejores serán los insights.
          </p>
        </div>

        <BusinessProfileForm
          initial={{
            business_description:      company.business_description ?? '',
            main_customer_type:        company.main_customer_type ?? '',
            avg_monthly_revenue_range: company.avg_monthly_revenue_range ?? '',
          }}
          companyName={company.name ?? 'tu empresa'}
        />
      </div>
    </>
  )
}
