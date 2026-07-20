import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Room, Reservation } from '@/types';


export async function GET() {
  const rooms = await readJson<Room[]>('rooms.json', []);
  const reservations = await readJson<Reservation[]>('reservations.json', []);
  const today = new Date().toISOString().split('T')[0];

  const updatedRooms = rooms.map(room => {
    if (room.status === 'maintenance') return room;
    const hasActive = reservations.some(r => {
      const checkIn = r.check_in || (r.dates?.split(' - ')[0] ?? '');
      const checkOut = r.check_out || (r.dates?.split(' - ')[1] ?? '');
      return r.room_id === room.id && today >= checkIn && today <= checkOut;
    });
    return {
      ...room,
      status: hasActive ? 'occupied' as const : room.status
    };
  });

  return NextResponse.json(updatedRooms);
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
