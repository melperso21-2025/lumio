'use client'

import { useState } from 'react'

const SALE_ID = 'f6624dc7-d3b9-4dfe-abc6-c8f6b90f204e'

const BODY = {
  sale_date: '2026-04-14',
  customer_id: '43f99db7-d8cb-4a95-a858-9904ac434c98',
  branch_id: '77a3f2c1-92c9-40df-a552-69a98b0bb1fc',
  channel_id: '94327314-7ede-4dc4-87a8-e6d4abee80e1',
  status: 'closed',
  items: [
    {
      product_id: '911e7486-60f6-42b2-a9ca-dfe451b0f72c',
      quantity: 1,
      unit_price: 34.5,
      unit_cost: 16,
      discount_amount: 0,
    },
    {
      product_id: 'eafee8ee-52d5-4745-87d7-565c7ac1ff53',
      quantity: 1,
      unit_price: 79.99,
      unit_cost: 37,
      discount_amount: 5,
    },
  ],
}

export default function TestPatchPage() {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/sales/${SALE_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(BODY),
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h1 style={{ marginBottom: 16 }}>Test PATCH /api/sales/{SALE_ID}</h1>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '8px 20px',
          fontSize: 14,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: 24,
        }}
      >
        {loading ? 'Enviando…' : 'Ejecutar PATCH'}
      </button>
      {result && (
        <pre
          style={{
            background: '#111',
            color: '#eee',
            padding: 20,
            borderRadius: 8,
            overflowX: 'auto',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {result}
        </pre>
      )}
    </div>
  )
}
