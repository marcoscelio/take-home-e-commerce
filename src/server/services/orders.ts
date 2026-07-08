import { z } from 'zod'
import { prisma } from '@/lib/db'

const checkoutSchema = z.object({
  lines: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
  outcome: z.enum(['approve', 'decline']).default('approve'),
})

export type CheckoutInput = z.input<typeof checkoutSchema>

export type CheckoutResult =
  | { ok: true; orderId: string; totalCents: number }
  | { ok: false; error: string; status: number; outOfStock?: { name: string; available: number }[] }

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid checkout payload', status: 400 }
  const { lines, outcome } = parsed.data

  if (outcome === 'decline') return { ok: false, error: 'Payment declined (simulated)', status: 402 }

  try {
    return await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } } })
      const map = new Map(products.map((p) => [p.id, p]))

      const outOfStock: { name: string; available: number }[] = []
      for (const line of lines) {
        const p = map.get(line.productId)
        if (!p) return { ok: false as const, error: 'A product in your cart no longer exists', status: 404 }
        if (p.stock < line.quantity) outOfStock.push({ name: p.name, available: p.stock })
      }
      if (outOfStock.length > 0) return { ok: false as const, error: 'Some items are out of stock', status: 409, outOfStock }

      let totalCents = 0
      const items = lines.map((line) => {
        const p = map.get(line.productId)!
        totalCents += p.priceCents * line.quantity
        return { productId: p.id, name: p.name, sku: p.sku, unitPriceCents: p.priceCents, quantity: line.quantity }
      })

      for (const line of lines) {
        await tx.product.update({ where: { id: line.productId }, data: { stock: { decrement: line.quantity } } })
      }

      const order = await tx.order.create({ data: { totalCents, status: 'PAID', items: { create: items } } })
      return { ok: true as const, orderId: order.id, totalCents }
    })
  } catch {
    return { ok: false, error: 'Checkout failed, please try again', status: 500 }
  }
}
