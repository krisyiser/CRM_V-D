import { NextResponse } from 'next/server';
import { readJson, writeJson, registerDeletedReservationId, deleteWebsiteReservationFromGitHub } from '@/lib/db';
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  try {
    const rooms = await readJson<Room[]>('rooms.json', []);
    const reservations = await readJson<Reservation[]>('reservations.json', []);
    const today = new Date().toISOString().split('T')[0];

    const updatedRooms = rooms.map(room => {
      // Preserve explicit manual maintenance or cleaning states
      if (room.status === 'maintenance' || room.status === 'cleaning') return room;

      const hasActiveReservation = reservations.some(r => {
        if (!r) return false;
        const statusLower = String(r.status || '').toLowerCase();
        if (
          statusLower === 'cancelled' ||
          statusLower === 'checkedout' ||
          statusLower === 'checked_out' ||
          statusLower === 'completed'
        ) {
          return false;
        }
        const checkIn = r.check_in || (r.dates?.split(' - ')[0] ?? '');
        const checkOut = r.check_out || (r.dates?.split(' - ')[1] ?? '');
        return String(r.room_id) === String(room.id) && today >= checkIn && today <= checkOut;
      });

      // If room was manually marked 'available' in rooms.json, prioritize that unless there's an active non-cancelled stay
      let calculatedStatus: Room['status'] = 'available';
      if (hasActiveReservation && room.status !== 'available') {
        calculatedStatus = 'occupied';
      } else if (!hasActiveReservation) {
        calculatedStatus = room.status || 'available';
      } else {
        calculatedStatus = room.status;
      }

      return {
        ...room,
        status: calculatedStatus
      };
    });

    return NextResponse.json(updatedRooms, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('[GET /api/rooms Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400, headers: CORS_HEADERS });
    }

    const roomIdStr = String(id).trim();
    const rooms = await readJson<Room[]>('rooms.json', []);
    const updated = rooms.map(r => String(r.id) === roomIdStr ? { ...r, status } : r);
    await writeJson('rooms.json', updated);

    // If changing room status to 'available', clear/cancel any active reservations for today for that room
    if (status === 'available') {
      const today = new Date().toISOString().split('T')[0];
      let reservations = await readJson<Reservation[]>('reservations.json', []);
      if (Array.isArray(reservations)) {
        let changed = false;
        const remainingReservations = reservations.filter(r => {
          if (!r) return false;
          if (String(r.room_id) === roomIdStr) {
            const checkIn = r.check_in || (r.dates?.split(' - ')[0] ?? '');
            const checkOut = r.check_out || (r.dates?.split(' - ')[1] ?? '');
            if (today >= checkIn && today <= checkOut) {
              changed = true;
              registerDeletedReservationId(r.id, r.external_id);
              deleteWebsiteReservationFromGitHub(r.id, r.external_id || undefined).catch(() => {});
              return false;
            }
          }
          return true;
        });

        if (changed) {
          await writeJson('reservations.json', remainingReservations);
        }
      }
    }

    return NextResponse.json({ success: true, room: updated.find(r => String(r.id) === roomIdStr) }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}
