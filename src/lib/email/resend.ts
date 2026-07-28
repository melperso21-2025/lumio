import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = 'noreply@getpulse.digital'
export const FROM_NAME  = 'Lumio'
export const FROM       = `${FROM_NAME} <${FROM_EMAIL}>`
