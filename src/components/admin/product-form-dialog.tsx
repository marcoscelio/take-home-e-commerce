'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { productFormSchema, type ProductFormValues } from '@/lib/validations'
import { createProductAction, updateProductAction } from '@/server/actions/products'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type AdminProduct = {
  id: string
  name: string
  sku: string
  description: string
  category: string
  priceCents: number
  stock: number
  weightKg: number | null
}

export function ProductFormDialog({ product, trigger }: { product?: AdminProduct; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isEdit = !!product

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku,
          description: product.description,
          category: product.category,
          price: product.priceCents / 100,
          stock: product.stock,
          weightKg: product.weightKg ?? undefined,
        }
      : { name: '', sku: '', description: '', category: '', price: 0, stock: 0 },
  })

  async function onSubmit(values: ProductFormValues) {
    const res = isEdit ? await updateProductAction(product!.id, values) : await createProductAction(values)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(isEdit ? 'Product updated' : 'Product created')
    setOpen(false)
    if (!isEdit) reset()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit product' : 'New product'}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Field label="Name" error={errors.name?.message}>
            <Input {...register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" error={errors.sku?.message}>
              <Input {...register('sku')} />
            </Field>
            <Field label="Category" error={errors.category?.message}>
              <Input {...register('category')} placeholder="Uncategorized" />
            </Field>
          </div>
          <Field label="Description" error={errors.description?.message}>
            <Textarea rows={2} {...register('description')} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Price (USD)" error={errors.price?.message}>
              <Input type="number" step="0.01" {...register('price')} />
            </Field>
            <Field label="Stock" error={errors.stock?.message}>
              <Input type="number" step="1" {...register('stock')} />
            </Field>
            <Field label="Weight (kg)" error={errors.weightKg?.message}>
              <Input type="number" step="0.01" {...register('weightKg')} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
