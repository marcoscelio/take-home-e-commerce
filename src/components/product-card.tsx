import { AddToCart } from '@/components/add-to-cart'
import { Card, CardContent } from '@/components/ui/card'
import { formatUSD } from '@/lib/utils'

type Product = {
  id: string
  name: string
  sku: string
  description: string
  category: string
  priceCents: number
  stock: number
  weightKg: number | null
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {product.category}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">{product.sku}</span>
        </div>
        <h3 className="font-semibold leading-tight">{product.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{product.description || '—'}</p>
        <div className="flex items-end justify-between pt-1">
          <span className="text-lg font-bold">{formatUSD(product.priceCents)}</span>
          <span className={product.stock > 0 ? 'text-xs text-muted-foreground' : 'text-xs font-medium text-destructive'}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
        </div>
      </CardContent>
      <div className="p-4 pt-0">
        <AddToCart
          productId={product.id}
          name={product.name}
          sku={product.sku}
          priceCents={product.priceCents}
          stock={product.stock}
        />
      </div>
    </Card>
  )
}
