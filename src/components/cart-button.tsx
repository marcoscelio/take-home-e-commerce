'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart-store'

export function CartButton() {
  const [mounted, setMounted] = useState(false)
  const count = useCart((s) => s.count())
  useEffect(() => setMounted(true), [])

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent"
      aria-label="Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="hidden sm:inline">Cart</span>
      {mounted && count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  )
}
