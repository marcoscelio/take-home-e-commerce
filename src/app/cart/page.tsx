'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatUSD } from '@/lib/utils'

export default function CartPage() {
  const [mounted, setMounted] = useState(false)
  const items = useCart((s) => s.items)
  const setQuantity = useCart((s) => s.setQuantity)
  const remove = useCart((s) => s.remove)
  const totalCents = useCart((s) => s.totalCents())
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
        <ShoppingCart className="h-10 w-10" />
        <p>Your cart is empty.</p>
        <Button asChild>
          <Link href="/">Browse products</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
      <div className="space-y-2">
        {items.map((i) => (
          <Card key={i.productId}>
            <CardContent className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{i.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatUSD(i.priceCents)} · <span className="font-mono">{i.sku}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(i.productId, i.quantity - 1)}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">{i.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={i.quantity >= i.stock}
                  onClick={() => setQuantity(i.productId, i.quantity + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="w-20 text-right text-sm font-semibold">{formatUSD(i.priceCents * i.quantity)}</div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i.productId)} aria-label="Remove">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-lg font-bold">Total: {formatUSD(totalCents)}</span>
        <Button asChild>
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
      </div>
    </div>
  )
}
