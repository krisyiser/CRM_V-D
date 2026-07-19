import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Product } from '@/types';

export async function GET() {
  const products = await readJson<Product[]>('products.json', []);
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const products = await readJson<Product[]>('products.json', []);

    const newProduct: Product = {
      id: body.id || `p_${Date.now()}`,
      name: body.name,
      category: body.category,
      price: Number(body.price),
      stock: body.stock ? Number(body.stock) : null,
      image: body.image || null,
      created_at: new Date().toISOString(),
    };

    products.push(newProduct);
    await writeJson('products.json', products);

    return NextResponse.json(newProduct);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const products = await readJson<Product[]>('products.json', []);
    const filtered = products.filter(p => p.id !== id);
    await writeJson('products.json', filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
