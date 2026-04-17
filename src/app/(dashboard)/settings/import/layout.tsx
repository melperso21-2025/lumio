import { redirect } from 'next/navigation'
import { getUserData } from '@/lib/queries/getUser'

export default async function SettingsImportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getUserData()

  if (!userData) redirect('/login')

  const isAdmin      = userData.role === 'admin'
  const isPulseAdmin = userData.is_pulse_admin === true

  if (!isAdmin && !isPulseAdmin) redirect('/dashboard')

  return <>{children}</>
}
