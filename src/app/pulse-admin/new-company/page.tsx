import { redirect } from 'next/navigation'

export default function PulseAdminNewCompanyRedirect() {
  redirect('/pulse-admin/companies?new=1')
}
