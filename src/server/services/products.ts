import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { productFormSchema } from '@/lib/validations'
import { dollarsToCents } from '@/lib/utils'

export type ServiceResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; status: number }

export type ProductQuery = {
  q?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc'
  page?: number
  perPage?: number
  inStockOnly?: boolean
}

function toData(input: unknown) {
  const parsed = productFormSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid data' }
  const v = parsed.data
  return {
    ok: true as const,
    data: {
      name: v.name,
      sku: v.sku,
      description: v.description ?? '',
      category: v.category ?? '',
      priceCents: dollarsToCents(v.price),
      stock: v.stock,
      weightKg: v.weightKg ?? null,
    },
  }
}

export async function createProduct(input: unknown): Promise<ServiceResult<{ id: string }>> {
  const mapped = toData(input)
  if (!mapped.ok) return { ok: false, error: mapped.error, status: 400 }
  try {
    const product = await prisma.product.create({ data: mapped.data })
    return { ok: true, id: product.id }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { ok: false, error: `SKU "${mapped.data.sku}" already exists`, status: 409 }
    return { ok: false, error: 'Failed to create product', status: 500 }
  }
}

export async function updateProduct(id: string, input: unknown): Promise<ServiceResult<{ id: string }>> {
  const mapped = toData(input)
  if (!mapped.ok) return { ok: false, error: mapped.error, status: 400 }
  try {
    await prisma.product.update({ where: { id }, data: mapped.data })
    return { ok: true, id }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { ok: false, error: `SKU "${mapped.data.sku}" already exists`, status: 409 }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
      return { ok: false, error: 'Product not found', status: 404 }
    return { ok: false, error: 'Failed to update product', status: 500 }
  }
}

export async function deleteProduct(id: string): Promise<ServiceResult> {
  try {
    await prisma.product.delete({ where: { id } })
    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
      return { ok: false, error: 'Product not found', status: 404 }
    return { ok: false, error: 'Failed to delete product', status: 500 }
  }
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } })
}

export async function queryProducts(query: ProductQuery) {
  const perPage = Math.min(query.perPage ?? 12, 60)
  const page = Math.max(query.page ?? 1, 1)

  const where: Prisma.ProductWhereInput = {}
  if (query.q) where.OR = [{ name: { contains: query.q } }, { sku: { contains: query.q } }, { description: { contains: query.q } }]
  if (query.category) where.category = query.category
  if (query.inStockOnly) where.stock = { gt: 0 }
  if (query.minPrice != null || query.maxPrice != null) {
    where.priceCents = {}
    if (query.minPrice != null) where.priceCents.gte = Math.round(query.minPrice * 100)
    if (query.maxPrice != null) where.priceCents.lte = Math.round(query.maxPrice * 100)
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === 'price_asc'
      ? { priceCents: 'asc' }
      : query.sort === 'price_desc'
        ? { priceCents: 'desc' }
        : query.sort === 'name_asc'
          ? { name: 'asc' }
          : { createdAt: 'desc' }

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * perPage, take: perPage }),
    prisma.product.count({ where }),
  ])

  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) }
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.product.findMany({ distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } })
  return rows.map((r) => r.category).filter(Boolean)
}
