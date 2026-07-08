import { beforeEach, afterAll, vi } from 'vitest'
import { prisma } from '@/lib/db'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

beforeEach(async () => {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
