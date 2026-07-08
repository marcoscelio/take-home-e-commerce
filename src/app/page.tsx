import Link from 'next/link'
import { PackageSearch } from 'lucide-react'
import { queryProducts, getCategories, type ProductQuery } from '@/server/services/products'
import { ProductCard } from '@/components/product-card'
import { StorefrontFilters } from '@/components/storefront-filters'

export const dynamic = 'force-dynamic'

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const query: ProductQuery = {
    q: sp.q,
    category: sp.category,
    sort: (sp.sort as ProductQuery['sort']) ?? 'newest',
    inStockOnly: sp.inStock === '1',
    page: sp.page ? Number(sp.page) : 1,
  }

  const [{ items, total, page, pages }, categories] = await Promise.all([queryProducts(query), getCategories()])

  const pageUrl = (p: number) => {
    const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])
    params.set('page', String(p))
    return `/?${params.toString()}`
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shop</h1>
        <p className="text-sm text-muted-foreground">{total} product{total === 1 ? '' : 's'}</p>
      </div>

      <StorefrontFilters categories={categories} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          <PackageSearch className="h-8 w-8" />
          <p>No products match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={{ ...p, priceCents: p.priceCents }} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 text-sm">
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="rounded-md border border-input px-3 py-1.5 hover:bg-accent">
              Previous
            </Link>
          )}
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={pageUrl(page + 1)} className="rounded-md border border-input px-3 py-1.5 hover:bg-accent">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
