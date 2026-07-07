'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { productFormSchema, type ProductFormValues } from '@/lib/validations'
import { dollarsToCents } from '@/lib/utils'

type Result = { ok: true; id: string } | { ok: false; error: string }

function toData(values: ProductFormValues) {
  return {
    name: values.name,
    sku: values.sku,
    description: values.description ?? '',
    category: values.category ?? '',
    priceCents: dollarsToCents(values.price),
    stock: values.stock,
    weightKg: values.weightKg ?? null,
  }
}

export async function createProductAction(values: ProductFormValues): Promise<Result> {
  const parsed = productFormSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid data' }
  try {
    const product = await prisma.product.create({ data: toData(parsed.data) })
    revalidatePath('/admin/products')
    revalidatePath('/')
    return { ok: true, id: product.id }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { ok: false, error: `SKU "${parsed.data.sku}" already exists` }
    return { ok: false, error: 'Failed to create product' }
  }
}

export async function updateProductAction(id: string, values: ProductFormValues): Promise<Result> {
  const parsed = productFormSchema.safeParse(values)
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid data' }
  try {
    await prisma.product.update({ where: { id }, data: toData(parsed.data) })
    revalidatePath('/admin/products')
    revalidatePath('/')
    return { ok: true, id }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      return { ok: false, error: `SKU "${parsed.data.sku}" already exists` }
    return { ok: false, error: 'Failed to update product' }
  }
}

export async function deleteProductAction(id: string): Promise<{ ok: boolean }> {
  await prisma.product.delete({ where: { id } })
  revalidatePath('/admin/products')
  revalidatePath('/')
  return { ok: true }
}

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

export async function queryProducts(query: ProductQuery) {
  const perPage = Math.min(query.perPage ?? 12, 60)
  const page = Math.max(query.page ?? 1, 1)

  const where: Prisma.ProductWhereInput = {}
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { sku: { contains: query.q } },
      { description: { contains: query.q } },
    ]
  }
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
