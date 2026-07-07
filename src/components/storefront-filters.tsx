'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function StorefrontFilters({ categories }: { categories: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const first = useRef(true)

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    sp.delete('page')
    router.replace(`${pathname}?${sp.toString()}`)
  }

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => apply({ q }), 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, description…" className="pl-9" />
      </div>
      <Select value={params.get('category') ?? ''} onChange={(e) => apply({ category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select value={params.get('sort') ?? 'newest'} onChange={(e) => apply({ sort: e.target.value })}>
        <option value="newest">Newest</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="name_asc">Name: A–Z</option>
      </Select>
      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 text-sm">
        <input
          type="checkbox"
          checked={params.get('inStock') === '1'}
          onChange={(e) => apply({ inStock: e.target.checked ? '1' : '' })}
          className="h-4 w-4"
        />
        In stock only
      </label>
    </div>
  )
}
