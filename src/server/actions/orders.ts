'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

export type CheckoutLine = { productId: string; quantity: number }

export type CheckoutResult =
  | { ok: true; orderId: string; totalCents: number }
  | { ok: false; error: string; outOfStock?: { name: string; available: number }[] }

export async function checkoutAction(lines: CheckoutLine[], outcome: 'approve' | 'decline' = 'approve'): Promise<CheckoutResult> {
  const clean = lines.filter((l) => l.quantity > 0)
  if (clean.length === 0) return { ok: false, error: 'Your cart is empty' }

  if (outcome === 'decline') return { ok: false, error: 'Payment declined (simulated)' }

  try {
    return await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: clean.map((l) => l.productId) } } })
      const map = new Map(products.map((p) => [p.id, p]))

      const outOfStock: { name: string; available: number }[] = []
      for (const line of clean) {
        const p = map.get(line.productId)
        if (!p) return { ok: false as const, error: 'A product in your cart no longer exists' }
        if (p.stock < line.quantity) outOfStock.push({ name: p.name, available: p.stock })
      }
      if (outOfStock.length > 0) return { ok: false as const, error: 'Some items are out of stock', outOfStock }

      let totalCents = 0
      const items = clean.map((line) => {
        const p = map.get(line.productId)!
        totalCents += p.priceCents * line.quantity
        return { productId: p.id, name: p.name, sku: p.sku, unitPriceCents: p.priceCents, quantity: line.quantity }
      })

      for (const line of clean) {
        await tx.product.update({ where: { id: line.productId }, data: { stock: { decrement: line.quantity } } })
      }

      const order = await tx.order.create({ data: { totalCents, status: 'PAID', items: { create: items } } })
      return { ok: true as const, orderId: order.id, totalCents }
    })
  } catch {
    return { ok: false, error: 'Checkout failed, please try again' }
  } finally {
    revalidatePath('/')
    revalidatePath('/admin/products')
  }
}
