import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Guest } from '@/types';

export async function GET() {
  const guests = await readJson<Guest[]>('guests.json', []);
  const sorted = [...guests].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return NextResponse.json(sorted);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nameStr = (body.name || '').trim();
    if (!nameStr) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const guests = await readJson<Guest[]>('guests.json', []);
    const existing = guests.find(g => g.name.toLowerCase() === nameStr.toLowerCase());
    
    if (existing) {
      return NextResponse.json(existing);
    }

    const newGuest: Guest = {
      id: body.id || `g_${Date.now()}`,
      name: nameStr,
      email: body.email || null,
      phone: body.phone || null,
      id_number: body.id_number || null,
      origin: body.origin || null,
      created_at: new Date().toISOString(),
    };

    // Unshift to put newest guest at the very top
    guests.unshift(newGuest);
    await writeJson('guests.json', guests);

    return NextResponse.json(newGuest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const guests = await readJson<Guest[]>('guests.json', []);
    const filtered = guests.filter(g => g.id !== id);
    await writeJson('guests.json', filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
