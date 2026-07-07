'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'
import { checkoutAction } from '@/server/actions/orders'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatUSD } from '@/lib/utils'

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false)
  const items = useCart((s) => s.items)
  const totalCents = useCart((s) => s.totalCents())
  const clear = useCart((s) => s.clear)
  const [busy, startTransition] = useTransition()
  const [done, setDone] = useState<{ orderId: string; totalCents: number } | null>(null)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <h1 className="text-2xl font-bold">Order confirmed</h1>
        <p className="text-muted-foreground">
          Paid {formatUSD(done.totalCents)} — order <span className="font-mono">{done.orderId.slice(0, 8)}</span>.
        </p>
        <Button asChild className="mt-2">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p>Nothing to check out.</p>
        <Button asChild className="mt-3">
          <Link href="/">Browse products</Link>
        </Button>
      </div>
    )
  }

  function pay(outcome: 'approve' | 'decline') {
    startTransition(async () => {
      const res = await checkoutAction(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        outcome,
      )
      if (res.ok) {
        clear()
        setDone({ orderId: res.orderId, totalCents: res.totalCents })
        return
      }
      if (res.outOfStock?.length) {
        toast.error(`${res.error}: ${res.outOfStock.map((o) => `${o.name} (${o.available} left)`).join(', ')}`)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <Card>
        <CardContent className="space-y-2">
          {items.map((i) => (
            <div key={i.productId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {i.quantity} × {i.name}
              </span>
              <span className="font-medium">{formatUSD(i.priceCents * i.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 font-bold">
            <span>Total</span>
            <span>{formatUSD(totalCents)}</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">Payment is simulated — no real card is charged.</p>

      <Button className="w-full" size="lg" disabled={busy} onClick={() => pay('approve')}>
        <CreditCard className="h-4 w-4" />
        {busy ? 'Processing…' : `Pay ${formatUSD(totalCents)} (simulated)`}
      </Button>
      <Button variant="outline" className="w-full" disabled={busy} onClick={() => pay('decline')}>
        Simulate declined payment
      </Button>
    </div>
  )
}
