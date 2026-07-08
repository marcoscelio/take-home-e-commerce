import { NextResponse } from 'next/server'
import { apiKeyValid } from '@/server/auth'
import { queryProducts, createProduct, type ProductQuery } from '@/server/services/products'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const g = (k: string) => url.searchParams.get(k) ?? undefined
  const query: ProductQuery = {
    q: g('q'),
    category: g('category'),
    sort: g('sort') as ProductQuery['sort'],
    minPrice: g('minPrice') ? Number(g('minPrice')) : undefined,
    maxPrice: g('maxPrice') ? Number(g('maxPrice')) : undefined,
    inStockOnly: g('inStock') === '1' || g('inStock') === 'true',
    page: g('page') ? Number(g('page')) : 1,
    perPage: g('perPage') ? Number(g('perPage')) : 12,
  }
  const result = await queryProducts(query)
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  if (!apiKeyValid(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const res = await createProduct(body)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ id: res.id }, { status: 201 })
}
