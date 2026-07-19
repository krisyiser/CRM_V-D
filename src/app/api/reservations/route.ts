import { NextResponse } from 'next/server';
import { readJson, writeJson, fetchWebsiteReservationsFromGitHub } from '@/lib/db';
import type { Reservation } from '@/types';

export async function GET() {
  let reservations = await readJson<Reservation[]>('reservations.json', []);

  // Sync with website GitHub repository
  try {
    const webReservations = await fetchWebsiteReservationsFromGitHub();
    if (webReservations.length > 0) {
      let updated = false;
      webReservations.forEach(webRes => {
        const exists = reservations.some(r => r.id === webRes.id || (webRes.external_id && r.external_id === webRes.external_id));
        if (!exists) {
          reservations.push(webRes);
          updated = true;
        }
      });
      if (updated) {
        await writeJson('reservations.json', reservations);
      }
    }
  } catch (e) {
    console.error('[Website GitHub Sync] Error syncing website reservations:', e);
  }

  return NextResponse.json(reservations);
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
    const filtered = reservations.filter(r => r.id !== id);
    await writeJson('reservations.json', filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
