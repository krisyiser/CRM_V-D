import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { PosSale } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CORS_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  const sales = await readJson<PosSale[]>('pos_sales.json', []);
  return NextResponse.json(sales, { headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sales = await readJson<PosSale[]>('pos_sales.json', []);

    const newSale: PosSale = {
      id: body.id || `s_${Date.now()}`,
      items_json: typeof body.items_json === 'string' ? body.items_json : JSON.stringify(body.items_json || []),
      total: Number(body.total),
      payment_method: body.payment_method,
      notes: body.notes || null,
      created_at: new Date().toISOString(),
    };

    sales.unshift(newSale);
    await writeJson('pos_sales.json', sales);

    return NextResponse.json(newSale);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const sales = await readJson<PosSale[]>('pos_sales.json', []);
    const filtered = sales.filter(s => s.id !== id);
    await writeJson('pos_sales.json', filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
