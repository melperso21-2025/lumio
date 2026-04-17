import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserData } from '@/lib/queries/getUser'
import Topbar from '@/components/layout/Topbar'
import ProfileForm, { type ProfileData } from '@/components/settings/ProfileForm'

export default async function ProfilePage() {
  const userData = await getUserData()
  if (!userData) redirect('/login')

  const supabase = await createClient()

  // Obtener todos los campos de perfil del usuario
  const { data: profile } = await supabase
    .from('users')
    .select(
      'id, full_name, email, role, job_title, phone, avatar_url, ' +
        'notify_whatsapp, notify_email, company_id'
    )
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  if (!profile) redirect('/dashboard')

  // Obtener nombre de empresa
  const { data: companyData } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id ?? '')
    .single()

  const profileData: ProfileData = {
    id:              profile.id,
    full_name:       profile.full_name,
    email:           profile.email,
    role:            profile.role,
    job_title:       profile.job_title,
    phone:           profile.phone,
    avatar_url:      profile.avatar_url,
    notify_whatsapp: profile.notify_whatsapp,
    notify_email:    profile.notify_email,
    company_name:    companyData?.name ?? null,
  }

  return (
    <>
      <Topbar
        pageTitle="Mi perfil"
        pageSubtitle="Gestiona tu información personal y preferencias"
      />
      <div
        style={{
          padding: '20px 24px',
          maxWidth: 720,
        }}
      >
        <ProfileForm profile={profileData} />
      </div>
    </>
  )
}
