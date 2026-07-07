'use client'

import { toast } from 'sonner'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'

type Props = { productId: string; name: string; sku: string; priceCents: number; stock: number }

export function AddToCart(props: Props) {
  const add = useCart((s) => s.add)
  const inCart = useCart((s) => s.items.find((i) => i.productId === props.productId)?.quantity ?? 0)
  const soldOut = props.stock <= 0
  const maxed = inCart >= props.stock

  return (
    <Button
      size="sm"
      className="w-full"
      disabled={soldOut || maxed}
      onClick={() => {
        add(props, 1)
        toast.success(`Added ${props.name} to cart`)
      }}
    >
      <ShoppingCart className="h-4 w-4" />
      {soldOut ? 'Sold out' : maxed ? 'Max in cart' : 'Add to cart'}
    </Button>
  )
}
