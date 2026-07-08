import { NextResponse } from 'next/server'
import { apiKeyValid } from '@/server/auth'
import { checkout } from '@/server/services/orders'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!apiKeyValid(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const res = await checkout(body ?? { lines: [] })
  if (!res.ok) return NextResponse.json({ error: res.error, outOfStock: res.outOfStock }, { status: res.status })
  return NextResponse.json({ orderId: res.orderId, totalCents: res.totalCents }, { status: 201 })
}
