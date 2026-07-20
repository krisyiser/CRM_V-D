import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Room, Reservation } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  const rooms = await readJson<Room[]>('rooms.json', []);
  const reservations = await readJson<Reservation[]>('reservations.json', []);
  const today = new Date().toISOString().split('T')[0];

  const updatedRooms = rooms.map(room => {
    if (room.status === 'maintenance') return room;
    const hasActive = reservations.some(r => {
      if (!r || r.status === 'Cancelled' || r.status === 'cancelled') return false;
      const checkIn = r.check_in || (r.dates?.split(' - ')[0] ?? '');
      const checkOut = r.check_out || (r.dates?.split(' - ')[1] ?? '');
      return r.room_id === room.id && today >= checkIn && today <= checkOut;
    });
    return {
      ...room,
      status: hasActive ? 'occupied' as const : 'available' as const
    };
  });

  return NextResponse.json(updatedRooms, { headers: CORS_HEADERS });
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400, headers: CORS_HEADERS });
    }

    const rooms = await readJson<Room[]>('rooms.json', []);
    const updated = rooms.map(r => r.id === id ? { ...r, status } : r);
    await writeJson('rooms.json', updated);

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}
