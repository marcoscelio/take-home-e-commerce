'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteProductAction } from '@/server/actions/products'
import { ProductFormDialog, type AdminProduct } from '@/components/admin/product-form-dialog'
import { ImportDialog } from '@/components/admin/import-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatUSD } from '@/lib/utils'

export function AdminProducts({ products }: { products: AdminProduct[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || p.category.toLowerCase().includes(s),
    )
  }, [products, q])

  function remove(p: AdminProduct) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteProductAction(p.id)
      toast.success('Product deleted')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, SKU, category…" className="pl-9" />
        </div>
        <ImportDialog />
        <ProductFormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> New product
            </Button>
          }
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Stock</th>
              <th className="px-3 py-2 text-right">Weight</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-accent/40">
                <td className="max-w-[240px] truncate px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.sku}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="px-3 py-2 text-right">{formatUSD(p.priceCents)}</td>
                <td className={`px-3 py-2 text-right ${p.stock <= 0 ? 'text-destructive' : ''}`}>{p.stock}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{p.weightKg != null ? `${p.weightKg} kg` : '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <ProductFormDialog
                      product={p}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(p)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
