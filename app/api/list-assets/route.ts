import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId') ?? 'shared';
  const prefix = `admin-uploads/${tenantId}/`;

  const { blobs } = await list({ prefix, limit: 200 });

  const assets = blobs
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .map((b) => ({
      url: b.url,
      pathname: b.pathname,
      uploadedAt: b.uploadedAt,
      size: b.size,
    }));

  return NextResponse.json(assets);
}
