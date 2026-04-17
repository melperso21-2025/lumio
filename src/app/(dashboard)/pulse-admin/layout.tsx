import { redirect } from 'next/navigation'
import { getUserData } from '@/lib/queries/getUser'

export default async function PulseAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userData = await getUserData()

  if (!userData) redirect('/login')

  if (!userData.is_pulse_admin) redirect('/dashboard')

  return <>{children}</>
}
