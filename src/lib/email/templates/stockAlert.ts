export interface LowStockProduct {
  name: string
  sku: string | null
  current_stock: number
  min_stock_alert: number
  unit_label: string | null
  category_name: string | null
}

export function stockAlertHtml(products: LowStockProduct[], companyName: string): string {
  const unit = (p: LowStockProduct) => p.unit_label ?? 'uds.'
  const rows = products.map((p) => {
    const isCritical = p.current_stock <= 0
    const color      = isCritical ? '#DC2626' : '#F97316'
    const badge      = isCritical ? 'SIN STOCK' : 'STOCK BAJO'
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a;">
          <div style="font-weight:600;color:#f1f5f9;font-size:14px;">${p.name}</div>
          ${p.sku ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${p.sku}</div>` : ''}
          ${p.category_name ? `<div style="font-size:11px;color:#64748b;">${p.category_name}</div>` : ''}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a;text-align:center;">
          <span style="display:inline-block;padding:3px 10px;border-radius:5px;font-size:11px;font-weight:700;background:${color}20;color:${color};">
            ${badge}
          </span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a;text-align:right;font-weight:700;color:${color};font-size:14px;">
          ${p.current_stock.toLocaleString('es-EC', { maximumFractionDigits: 3 })} ${unit(p)}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a3a;text-align:right;color:#64748b;font-size:13px;">
          Mín: ${p.min_stock_alert.toLocaleString('es-EC', { maximumFractionDigits: 3 })} ${unit(p)}
        </td>
      </tr>`
  }).join('')

  const criticalCount = products.filter((p) => p.current_stock <= 0).length
  const lowCount      = products.length - criticalCount

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
                <td>
                  <span style="font-size:22px;font-weight:800;color:#F5C842;letter-spacing:-0.5px;">lumio</span>
                </td>
                <td align="right">
                  <span style="font-size:11px;color:#475569;">${companyName}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="background:#1a1a2e;border:1px solid #2a2a3a;border-radius:12px;padding:24px;margin-bottom:16px;">
            <div style="font-size:28px;margin-bottom:12px;">⚠️</div>
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f1f5f9;">
              Alerta de stock bajo
            </h1>
            <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
              Se detectaron <strong style="color:#f1f5f9;">${products.length} producto${products.length !== 1 ? 's' : ''}</strong> con stock por debajo del mínimo establecido.
              ${criticalCount > 0 ? `<br><strong style="color:#DC2626;">${criticalCount} sin stock disponible.</strong>` : ''}
              ${lowCount > 0 ? `<br><strong style="color:#F97316;">${lowCount} con stock bajo.</strong>` : ''}
            </p>
          </td>
        </tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- Products table -->
        <tr>
          <td style="background:#1a1a2e;border:1px solid #2a2a3a;border-radius:12px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="background:#12122a;">
                  <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">Producto</th>
                  <th style="padding:10px 16px;text-align:center;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">Estado</th>
                  <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">Stock actual</th>
                  <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.08em;">Mínimo</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
        </tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:8px 0 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/inventory"
               style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#F5C842,#F09A1A);color:#1A1B2E;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">
              Ver inventario →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 0;border-top:1px solid #2a2a3a;text-align:center;">
            <p style="margin:0;font-size:11px;color:#334155;">
              Lumio · Sistema de BI para PyMEs · Esta alerta se envía automáticamente cada día.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function stockAlertText(products: LowStockProduct[], companyName: string): string {
  const lines = products.map((p) =>
    `• ${p.name}${p.sku ? ` (${p.sku})` : ''}: ${p.current_stock} ${p.unit_label ?? 'uds.'} (mín: ${p.min_stock_alert})`
  )
  return `LUMIO — Alerta de stock bajo | ${companyName}\n\n${lines.join('\n')}\n\nVer inventario: ${process.env.NEXT_PUBLIC_APP_URL}/inventory`
}
