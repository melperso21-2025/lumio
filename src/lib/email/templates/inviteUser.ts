export function inviteUserHtml(params: {
  fullName: string
  companyName: string
  inviterName: string
  role: string
  actionLink: string
}): string {
  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    operator: 'Operativo',
  }
  const roleName = roleLabel[params.role] ?? params.role

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><span style="font-size:22px;font-weight:800;color:#F5C842;letter-spacing:-0.5px;">lumio</span></td>
                <td align="right"><span style="font-size:11px;color:#475569;">by Pulse</span></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card principal -->
        <tr>
          <td style="background:#1a1a2e;border:1px solid #2a2a3a;border-radius:12px;padding:32px;">
            <p style="margin:0 0 20px;font-size:28px;">👋</p>
            <h1 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#f1f5f9;">
              Te invitaron a unirte a ${params.companyName}
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.7;">
              Hola <strong style="color:#f1f5f9;">${params.fullName}</strong>,<br>
              <strong style="color:#f1f5f9;">${params.inviterName}</strong> te invitó a unirte a
              <strong style="color:#f1f5f9;">${params.companyName}</strong> en Lumio con el rol de
              <span style="display:inline-block;padding:2px 10px;background:rgba(124,58,237,0.15);color:#a78bfa;border-radius:4px;font-size:12px;font-weight:600;">${roleName}</span>.
            </p>
            <p style="margin:0 0 28px;font-size:13px;color:#64748b;line-height:1.6;">
              Haz clic en el botón para activar tu cuenta y establecer tu contraseña. Este enlace expira en <strong style="color:#94a3b8;">24 horas</strong>.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <a href="${params.actionLink}"
                     style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F5C842,#F09A1A);color:#1A1B2E;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none;">
                    Activar mi cuenta →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- Nota de seguridad -->
        <tr>
          <td style="background:#12122a;border:1px solid #2a2a3a;border-radius:8px;padding:14px 18px;">
            <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
              🔒 Si no esperabas esta invitación, puedes ignorar este email de forma segura.<br>
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <a href="${params.actionLink}" style="color:#F5C842;word-break:break-all;font-size:11px;">${params.actionLink}</a>
            </p>
          </td>
        </tr>

        <tr><td style="height:24px;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 0;border-top:1px solid #2a2a3a;text-align:center;">
            <p style="margin:0;font-size:11px;color:#334155;">
              Lumio · Sistema de BI para PyMEs · getpulse.solutions
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function inviteUserText(params: {
  fullName: string
  companyName: string
  inviterName: string
  role: string
  actionLink: string
}): string {
  return `LUMIO — Invitación a ${params.companyName}

Hola ${params.fullName},

${params.inviterName} te invitó a unirte a ${params.companyName} en Lumio con el rol de ${params.role}.

Activa tu cuenta aquí (válido por 24 horas):
${params.actionLink}

Si no esperabas esta invitación, ignora este email.

— Lumio by Pulse`
}
