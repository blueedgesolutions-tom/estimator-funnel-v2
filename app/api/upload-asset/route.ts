import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const tenantId = (form.get('tenantId') as string | null) ?? 'shared';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const safeName = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 64);

  const pathname = `admin-uploads/${tenantId}/${uuid()}-${safeName}.webp`;

  const blob = await put(pathname, file, {
    access: 'public',
    contentType: 'image/webp',
  });

  return NextResponse.json({ url: blob.url, pathname: blob.pathname });
}
