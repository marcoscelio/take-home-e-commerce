import { prisma } from '@/lib/db'
import { AdminProducts } from '@/components/admin/admin-products'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">Manage catalog · {products.length} items</p>
      </div>
      <AdminProducts
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          description: p.description,
          category: p.category,
          priceCents: p.priceCents,
          stock: p.stock,
          weightKg: p.weightKg,
        }))}
      />
    </div>
  )
}
