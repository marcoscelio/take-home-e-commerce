'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  productId: string
  name: string
  sku: string
  priceCents: number
  stock: number
  quantity: number
}

type CartState = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  setQuantity: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
  totalCents: () => number
  count: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          const max = item.stock
          if (existing) {
            const quantity = Math.min(existing.quantity + qty, max)
            return { items: state.items.map((i) => (i.productId === item.productId ? { ...i, quantity, stock: max } : i)) }
          }
          return { items: [...state.items, { ...item, quantity: Math.min(qty, max) }] }
        }),
      setQuantity: (productId, qty) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) } : i))
            .filter((i) => i.quantity > 0),
        })),
      remove: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
      totalCents: () => get().items.reduce((s, i) => s + i.priceCents * i.quantity, 0),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'ntd-cart' },
  ),
)
