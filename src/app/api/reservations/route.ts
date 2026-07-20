import { NextResponse } from 'next/server';
import { readJson, writeJson, fetchWebsiteReservationsFromGitHub } from '@/lib/db';
import type { Reservation } from '@/types';

export async function GET() {
  let reservations = await readJson<Reservation[]>('reservations.json', []);
  const cancelledIds = await readJson<string[]>('cancelled_reservations.json', []);

  // Sync with website GitHub repository
  try {
    const webReservations = await fetchWebsiteReservationsFromGitHub();
    if (webReservations.length > 0) {
      let updated = false;
      webReservations.forEach(webRes => {
        // Skip if this reservation was cancelled locally
        if (cancelledIds.includes(webRes.id) || (webRes.external_id && cancelledIds.includes(webRes.external_id))) {
          return;
        }

        const existingIndex = reservations.findIndex(r => r.id === webRes.id || (webRes.external_id && r.external_id === webRes.external_id));
        if (existingIndex === -1) {
          reservations.push(webRes);
          updated = true;
        } else if (reservations[existingIndex].status === 'Cancelled') {
          // Keep cancelled status locally
          return;
        }
      });
      if (updated) {
        await writeJson('reservations.json', reservations);
      }
    }
  } catch (e) {
    console.error('[Website GitHub Sync] Error syncing website reservations:', e);
  }

  // Filter out cancelled reservations for UI display
  const activeReservations = reservations.filter(r => r.status !== 'Cancelled' && !cancelledIds.includes(r.id));
  return NextResponse.json(activeReservations);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reservations = await readJson<Reservation[]>('reservations.json', []);

    const checkIn = body.check_in || (body.dates?.split(' - ')[0] ?? '');
    const checkOut = body.check_out || (body.dates?.split(' - ')[1] ?? '');

    const newReservation: Reservation = {
      id: body.id || `res_${Date.now()}`,
      room_id: body.room_id,
      guest_id: body.guest_id || null,
      guest_name: body.guest_name,
      check_in: checkIn,
      check_out: checkOut,
      dates: body.dates || `${checkIn} - ${checkOut}`,
      total_price: Number(body.total_price) || 0,
      notes: body.notes || null,
      payment_status: body.payment_status || 'paid',
      status: body.status || 'Confirmed',
      external_id: body.external_id || null,
      created_at: new Date().toISOString(),
    };

    reservations.push(newReservation);
    await writeJson('reservations.json', reservations);

    return NextResponse.json(newReservation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const reservations = await readJson<Reservation[]>('reservations.json', []);
    const target = reservations.find(r => r.id === id || r.external_id === id);

    const updated = reservations.map(r => {
      if (r.id === id || (target?.external_id && r.external_id === target.external_id)) {
        return { ...r, status: 'Cancelled' };
      }
      return r;
    });

    const cancelledIds = await readJson<string[]>('cancelled_reservations.json', []);
    if (!cancelledIds.includes(id)) cancelledIds.push(id);
    if (target?.external_id && !cancelledIds.includes(target.external_id)) cancelledIds.push(target.external_id);
    await writeJson('cancelled_reservations.json', cancelledIds);

    await writeJson('reservations.json', updated);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
