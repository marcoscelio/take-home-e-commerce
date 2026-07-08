import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/db'
import { checkout } from '@/server/services/orders'

function makeProduct(over: Partial<{ stock: number; priceCents: number }> = {}) {
  return prisma.product.create({
    data: {
      name: 'P',
      sku: 'SKU-' + Math.random().toString(36).slice(2, 10),
      description: '',
      category: 'C',
      priceCents: 1000,
      stock: 10,
      ...over,
    },
  })
}

describe('checkout (integration)', () => {
  it('decrements stock and records an order with an item snapshot', async () => {
    const p = await makeProduct({ stock: 10, priceCents: 1500 })
    const res = await checkout({ lines: [{ productId: p.id, quantity: 3 }] })

    expect(res.ok).toBe(true)
    if (res.ok) expect(res.totalCents).toBe(4500)
    expect((await prisma.product.findUnique({ where: { id: p.id } }))?.stock).toBe(7)
    expect(await prisma.order.count()).toBe(1)

    const items = await prisma.orderItem.findMany()
    expect(items[0]).toMatchObject({ sku: p.sku, unitPriceCents: 1500, quantity: 3 })
  })

  it('rejects when a single item is out of stock, leaving stock and orders untouched', async () => {
    const p = await makeProduct({ stock: 2 })
    const res = await checkout({ lines: [{ productId: p.id, quantity: 5 }] })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(409)
      expect(res.outOfStock?.[0]).toMatchObject({ available: 2 })
    }
    expect((await prisma.product.findUnique({ where: { id: p.id } }))?.stock).toBe(2)
    expect(await prisma.order.count()).toBe(0)
  })

  it('is atomic across items: one out-of-stock line blocks the whole order', async () => {
    const a = await makeProduct({ stock: 10 })
    const b = await makeProduct({ stock: 1 })
    const res = await checkout({
      lines: [
        { productId: a.id, quantity: 2 },
        { productId: b.id, quantity: 5 },
      ],
    })

    expect(res.ok).toBe(false)
    expect((await prisma.product.findUnique({ where: { id: a.id } }))?.stock).toBe(10)
    expect(await prisma.order.count()).toBe(0)
  })

  it('does not touch the database on a declined payment', async () => {
    const p = await makeProduct({ stock: 5 })
    const res = await checkout({ lines: [{ productId: p.id, quantity: 1 }], outcome: 'decline' })

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(402)
    expect((await prisma.product.findUnique({ where: { id: p.id } }))?.stock).toBe(5)
    expect(await prisma.order.count()).toBe(0)
  })

  it('rolls back all writes when a transaction throws (transaction safety)', async () => {
    const p = await makeProduct({ stock: 5 })
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: 5 } } })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect((await prisma.product.findUnique({ where: { id: p.id } }))?.stock).toBe(5)
  })
})
