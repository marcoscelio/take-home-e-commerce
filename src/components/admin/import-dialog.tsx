'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { importCsvAction, type ImportSummary } from '@/server/actions/import'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ImportDialog() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, startTransition] = useTransition()
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSummary(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      startTransition(async () => {
        const res = await importCsvAction(text)
        setSummary(res)
        if (res.ok) {
          toast.success(`Imported ${res.created} new, updated ${res.updated}`)
          router.refresh()
        } else {
          toast.error(res.error ?? 'Import failed')
        }
      })
    }
    reader.readAsText(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Import products from CSV</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Columns: <span className="font-mono text-xs">name, sku, description, category, price, stock, weight_kg</span>. Rows are
          matched by SKU (existing SKUs are updated). Invalid rows are skipped and reported.
        </p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        <Button onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload className="h-4 w-4" /> {busy ? 'Importing…' : 'Choose CSV file'}
        </Button>

        {summary?.ok && (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="flex flex-wrap gap-3">
              <Stat label="Created" value={summary.created} tone="green" />
              <Stat label="Updated" value={summary.updated} tone="blue" />
              <Stat label="Skipped" value={summary.skipped} tone="red" />
              <Stat label="Dupes merged" value={summary.duplicatesInFile} tone="muted" />
            </div>
            {summary.errors.length > 0 && (
              <div className="max-h-40 space-y-0.5 overflow-y-auto border-t border-border pt-2 text-xs text-muted-foreground">
                {summary.errors.map((e, i) => (
                  <div key={i}>
                    Line {e.row}
                    {e.sku ? ` (${e.sku})` : ''}: {e.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'red' | 'muted' }) {
  const color =
    tone === 'green' ? 'text-green-600' : tone === 'blue' ? 'text-blue-600' : tone === 'red' ? 'text-destructive' : 'text-foreground'
  return (
    <div>
      <span className={`text-lg font-bold ${color}`}>{value}</span> <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
