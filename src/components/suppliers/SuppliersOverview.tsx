'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import KpiCard from '@/components/ui/KpiCard'
import NewSupplierForm from './NewSupplierForm'
import SuppliersTable, { type SupplierRow } from './SuppliersTable'
import EditSupplierModal from './EditSupplierModal'

interface SuppliersOverviewProps {
  companyId: string
  from?: string
  to?: string
  suppliersWithActivity?: number
  totalUnitsIn?: number
  movementsCount?: number
  totalSuppliersWithProducts?: number
}

export default function SuppliersOverview({
  companyId,
  from,
  to,
  suppliersWithActivity = 0,
  totalUnitsIn = 0,
  movementsCount = 0,
  totalSuppliersWithProducts = 0,
}: SuppliersOverviewProps) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SupplierRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadSuppliers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('suppliers')
      .select(
        'id, name, first_name, last_name, is_company, id_type, tax_id, celular, telefono, email, address, bank_name, bank_account, account_type, is_active, created_at'
      )
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name')
    setSuppliers(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { loadSuppliers() }, [loadSuppliers])

  // KPIs — directorio
  const active      = suppliers.filter((s) => s.is_active !== false)
  const withBanking = active.filter((s) => s.bank_account && s.bank_account.trim())
  const withRUC     = active.filter((s) => s.id_type === 'ruc' && s.tax_id)

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proveedor? Esta acción es reversible.')) return
    setDeletingId(id)
    setDeleteError(null)
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      await loadSuppliers()
    } else {
      const body = await res.json().catch(() => ({}))
      setDeleteError(body.error ?? 'Error al eliminar proveedor')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPIs — período */}
      {(from && to) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <KpiCard
            label="Proveedores con entradas"
            value={suppliersWithActivity}
            compare="en el período seleccionado"
          />
          <KpiCard
            label="Unidades ingresadas"
            value={totalUnitsIn.toLocaleString('es-EC')}
            compare={`${movementsCount} movimiento${movementsCount !== 1 ? 's' : ''} de entrada`}
          />
          <KpiCard
            label="Con productos asignados"
            value={totalSuppliersWithProducts}
            compare="proveedores con catálogo"
          />
        </div>
      )}

      {/* KPIs — directorio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <KpiCard label="Proveedores activos"   value={loading ? '…' : active.length} />
        <KpiCard label="Con datos bancarios"   value={loading ? '…' : withBanking.length} />
        <KpiCard label="Con RUC registrado"    value={loading ? '…' : withRUC.length} />
      </div>

      {/* Header + action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h2 className="font-syne font-bold" style={{ fontSize: 15, color: 'var(--text)', margin: 0 }}>
          Proveedores
        </h2>
        <NewSupplierForm onSuccess={loadSuppliers} />
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.3)',
            color: '#dc2626',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <span style={{ flexShrink: 0, marginTop: 1 }}>⛔</span>
          <span style={{ flex: 1 }}>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 4 }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <SuppliersTable
          suppliers={suppliers}
          onEdit={(s) => setEditing(s)}
          onDelete={handleDelete}
        />
      </div>

      {/* Edit modal */}
      {editing && (
        <EditSupplierModal
          supplier={editing as Parameters<typeof EditSupplierModal>[0]['supplier']}
          onClose={() => setEditing(null)}
          onSuccess={loadSuppliers}
        />
      )}

      {deletingId && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 12, color: 'var(--text2)', zIndex: 60 }}>
          Eliminando…
        </div>
      )}
    </div>
  )
}
