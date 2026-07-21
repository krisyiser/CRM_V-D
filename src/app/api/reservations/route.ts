import { NextResponse } from 'next/server';
import { readJson, writeJson, registerDeletedReservationId, deleteWebsiteReservationFromGitHub } from '@/lib/db';
import type { Reservation, Guest } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    let reservations = await readJson<Reservation[]>('reservations.json', []);
    if (!Array.isArray(reservations)) reservations = [];

    // Filter out cancelled reservations for UI display
    const activeReservations = reservations.filter(r =>
      r &&
      r.status !== 'Cancelled' &&
      r.status !== 'cancelled'
    );
    return NextResponse.json(activeReservations, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('[GET /api/reservations Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reservations = await readJson<Reservation[]>('reservations.json', []);
    const resList = Array.isArray(reservations) ? reservations : [];

    const checkIn = body.check_in || body.checkIn || (body.dates?.split(' - ')[0] ?? '');
    const checkOut = body.check_out || body.checkOut || (body.dates?.split(' - ')[1] ?? '');
    const guestName = body.guest_name || body.guestName || body.name || 'Huésped';

    const email = body.email || body.guest_email || null;
    const phone = body.phone || body.guest_phone || null;

    let guestId = body.guest_id || null;
    if (!guestId && (email || phone || guestName)) {
      let guests = await readJson<Guest[]>('guests.json', []);
      if (!Array.isArray(guests)) guests = [];
      const existing = guests.find(g => 
        (email && g.email && g.email.toLowerCase() === email.toLowerCase()) ||
        (phone && g.phone && g.phone === phone)
      );
      if (existing) {
        guestId = existing.id;
      } else {
        const newGuest: Guest = {
          id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: guestName,
          email: email,
          phone: phone,
          id_number: null,
          origin: body.origin || 'Reserva Directa',
          created_at: new Date().toISOString()
        };
        guests.push(newGuest);
        guestId = newGuest.id;
        await writeJson('guests.json', guests);
      }
    }

    const externalId = body.external_id || body.reservation_id || body.id || null;

    const existingIdx = resList.findIndex(r => r && externalId && (r.id === externalId || r.external_id === externalId));

    const newReservation: Reservation = {
      id: existingIdx >= 0 ? resList[existingIdx].id : (body.id || `res_${Date.now()}`),
      room_id: String(body.room_id || body.roomId || '101'),
      guest_id: guestId,
      guest_name: guestName,
      check_in: checkIn,
      check_out: checkOut,
      dates: body.dates || `${checkIn} - ${checkOut}`,
      total_price: Number(body.total_price || body.totalPrice) || 0,
      notes: body.notes || null,
      payment_status: body.payment_status || body.paymentStatus || 'paid',
      status: body.status || 'Confirmed',
      external_id: externalId,
      created_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      resList[existingIdx] = newReservation;
    } else {
      resList.push(newReservation);
    }

    await writeJson('reservations.json', resList);

    return NextResponse.json(newReservation, { status: 200, headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request) {
  try {
    let rawId: any = null;
    try {
      const body = await request.json();
      rawId = body.id || body.external_id || body.reservation_id || null;
    } catch {
      // Fallback to URL search parameters
    }

    if (!rawId) {
      const url = new URL(request.url);
      rawId = url.searchParams.get('id') || url.searchParams.get('external_id') || url.searchParams.get('reservation_id');
    }

    if (!rawId) {
      return NextResponse.json({ error: 'id o external_id requerido para eliminación' }, { status: 400, headers: CORS_HEADERS });
    }

    const targetId = String(rawId).trim().toLowerCase();
    registerDeletedReservationId(targetId);

    const rawReservations = await readJson<Reservation[]>('reservations.json', []);
    const reservations = Array.isArray(rawReservations) ? rawReservations : [];

    const initialLen = reservations.length;

    const updated = reservations.filter(r => {
      if (!r) return false;
      const rId = String(r.id || '').trim().toLowerCase();
      const rExtId = String(r.external_id || '').trim().toLowerCase();

      const directMatch = rId === targetId || rExtId === targetId;
      const substringMatch = (rId.length > 3 && targetId.includes(rId)) || (rExtId.length > 3 && targetId.includes(rExtId)) || (rId.length > 3 && rId.includes(targetId));

      if (directMatch || substringMatch) {
        registerDeletedReservationId(rId, rExtId);
        return false;
      }
      return true;
    });

    const removedCount = initialLen - updated.length;

    await writeJson('reservations.json', updated);
    await deleteWebsiteReservationFromGitHub(targetId).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        removedCount,
        message: `Reservación ${rawId} eliminada correctamente`
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[DELETE /api/reservations Error]:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500, headers: CORS_HEADERS });
  }
}
