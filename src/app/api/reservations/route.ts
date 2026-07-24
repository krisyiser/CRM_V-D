import { NextResponse } from 'next/server';
import { readJson, registerDeletedReservationId, deleteWebsiteReservationFromGitHub, fetchWebsiteReservationsFromGitHub, updateJsonTransactional } from '@/lib/db';
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

    // Also fetch online website reservations queued on Vainilla-y-Descanso db.json
    try {
      const websiteRes = await fetchWebsiteReservationsFromGitHub();
      if (Array.isArray(websiteRes) && websiteRes.length > 0) {
        let addedCount = 0;
        const mergedReservations = await updateJsonTransactional<Reservation[]>(
          'reservations.json',
          (currentList) => {
            const list = Array.isArray(currentList) ? currentList : [];
            const updated = [...list];
            for (const wRes of websiteRes) {
              if (!wRes) continue;
              const wId = String(wRes.id || '').trim().toLowerCase();
              const wExtId = String(wRes.external_id || '').trim().toLowerCase();

              const exists = updated.some(r => {
                if (!r) return false;
                const rId = String(r.id || '').trim().toLowerCase();
                const rExtId = String(r.external_id || '').trim().toLowerCase();

                return (
                  (wId && rId === wId) ||
                  (wExtId && rExtId === wExtId) ||
                  (wId && rExtId === wId) ||
                  (wExtId && rId === wExtId) ||
                  (String(r.room_id) === String(wRes.room_id) && r.check_in === wRes.check_in && r.check_out === wRes.check_out && r.guest_name === wRes.guest_name)
                );
              });

              if (!exists) {
                updated.push(wRes);
                addedCount++;
              }
            }
            return updated;
          },
          []
        );
        reservations = mergedReservations;
      }
    } catch (webErr) {
      console.warn('[GET /api/reservations] Could not sync website reservations:', webErr);
    }

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

    const checkIn = body.check_in || body.checkIn || (body.dates?.split(' - ')[0] ?? '');
    const checkOut = body.check_out || body.checkOut || (body.dates?.split(' - ')[1] ?? '');
    const guestName = body.guest_name || body.guestName || body.name || 'Huésped';

    const email = body.email || body.guest_email || null;
    const phone = body.phone || body.guest_phone || null;

    let guestId = body.guest_id || null;
    if (!guestId && (email || phone || guestName)) {
      await updateJsonTransactional<Guest[]>(
        'guests.json',
        (guestsList) => {
          const list = Array.isArray(guestsList) ? guestsList : [];
          const existing = list.find(g => 
            (email && g.email && g.email.toLowerCase() === email.toLowerCase()) ||
            (phone && g.phone && g.phone === phone)
          );
          if (existing) {
            guestId = existing.id;
            return list;
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
            guestId = newGuest.id;
            return [...list, newGuest];
          }
        },
        []
      );
    }

    const externalId = body.external_id || body.reservation_id || body.id || null;
    let newReservation: Reservation | null = null;

    await updateJsonTransactional<Reservation[]>(
      'reservations.json',
      (reservationsList) => {
        const list = Array.isArray(reservationsList) ? reservationsList : [];
        const existingIdx = list.findIndex(r => r && externalId && (r.id === externalId || r.external_id === externalId));

        newReservation = {
          id: existingIdx >= 0 ? list[existingIdx].id : (body.id || `res_${Date.now()}`),
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

        const updatedList = [...list];
        if (existingIdx >= 0) {
          updatedList[existingIdx] = newReservation;
        } else {
          updatedList.push(newReservation);
        }
        return updatedList;
      },
      []
    );
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
    await registerDeletedReservationId(targetId);

    const matchedIds: string[] = [];
    let removedCount = 0;

    await updateJsonTransactional<Reservation[]>(
      'reservations.json',
      (reservationsList) => {
        const list = Array.isArray(reservationsList) ? reservationsList : [];
        const filtered = list.filter(r => {
          if (!r) return false;
          const rId = String(r.id || '').trim().toLowerCase();
          const rExtId = String(r.external_id || '').trim().toLowerCase();

          const directMatch = rId === targetId || rExtId === targetId;
          const substringMatch = (rId.length > 3 && targetId.includes(rId)) || (rExtId.length > 3 && targetId.includes(rExtId)) || (rId.length > 3 && rId.includes(targetId));

          if (directMatch || substringMatch) {
            matchedIds.push(rId);
            if (rExtId) matchedIds.push(rExtId);
            return false;
          }
          return true;
        });
        removedCount = list.length - filtered.length;
        return filtered;
      },
      []
    );

    if (matchedIds.length > 0) {
      await registerDeletedReservationId(...matchedIds);
    }

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
