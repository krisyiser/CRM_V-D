import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { RoomCharge } from '@/types';

export async function GET() {
  const charges = await readJson<RoomCharge[]>('room_charges.json', []);
  return NextResponse.json(charges);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const charges = await readJson<RoomCharge[]>('room_charges.json', []);

    const newCharge: RoomCharge = {
      id: body.id || `rc_${Date.now()}`,
      room_id: body.room_id,
      guest_name: body.guest_name,
      items_json: typeof body.items_json === 'string' ? body.items_json : JSON.stringify(body.items_json || []),
      total: Number(body.total),
      created_at: new Date().toISOString(),
    };

    charges.unshift(newCharge);
    await writeJson('room_charges.json', charges);

    return NextResponse.json(newCharge);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const charges = await readJson<RoomCharge[]>('room_charges.json', []);
    const filtered = charges.filter(c => c.id !== id);
    await writeJson('room_charges.json', filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
