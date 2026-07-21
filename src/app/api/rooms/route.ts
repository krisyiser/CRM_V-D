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

import { getTodayDateStr, isReservationActiveOnDate } from '@/lib/dateUtils';
import { fetchWebsiteReservationsFromGitHub } from '@/lib/db';

export async function GET() {
  try {
    const rooms = await readJson<Room[]>('rooms.json', []);
    const localRes = await readJson<Reservation[]>('reservations.json', []);
    const websiteRes = await fetchWebsiteReservationsFromGitHub().catch(() => []);
    const reservations = [...localRes, ...websiteRes];
    const today = getTodayDateStr();

    const updatedRooms = rooms.map(room => {
      if (room.status === 'maintenance' || room.status === 'cleaning') return room;

      const hasActiveReservation = reservations.some(r => {
        if (!r) return false;
        return String(r.room_id) === String(room.id) && isReservationActiveOnDate(r, today);
      });

      let calculatedStatus: Room['status'] = 'available';
      if (room.status === 'occupied') {
        calculatedStatus = 'occupied';
      } else if (hasActiveReservation) {
        calculatedStatus = 'reserved';
      } else {
        calculatedStatus = room.status || 'available';
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
      const today = getTodayDateStr();
      let reservations = await readJson<Reservation[]>('reservations.json', []);
      if (Array.isArray(reservations)) {
        let changed = false;
        const remainingReservations = reservations.filter(r => {
          if (!r) return false;
          if (String(r.room_id) === roomIdStr) {
            if (isReservationActiveOnDate(r, today)) {
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
