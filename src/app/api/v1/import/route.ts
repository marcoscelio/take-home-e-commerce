import { NextResponse } from 'next/server'
import { apiKeyValid } from '@/server/auth'
import { importProducts } from '@/server/services/import'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  if (!apiKeyValid(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = request.headers.get('content-type') ?? ''
  let text: string

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 })
    text = await file.text()
  } else {
    text = await request.text()
  }

  const res = await importProducts(text)
  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
