import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Room } from '@/types';

export async function GET() {
  const rooms = await readJson<Room[]>('rooms.json', []);
  return NextResponse.json(rooms);
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    const rooms = await readJson<Room[]>('rooms.json', []);
    const updated = rooms.map(r => r.id === id ? { ...r, status } : r);
    await writeJson('rooms.json', updated);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
