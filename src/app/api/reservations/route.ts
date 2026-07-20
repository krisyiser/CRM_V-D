import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Reservation } from '@/types';

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
    return NextResponse.json(activeReservations);
  } catch (error: any) {
    console.error('[GET /api/reservations Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reservations = await readJson<Reservation[]>('reservations.json', []);
    const resList = Array.isArray(reservations) ? reservations : [];

    const checkIn = body.check_in || (body.dates?.split(' - ')[0] ?? '');
    const checkOut = body.check_out || (body.dates?.split(' - ')[1] ?? '');

    const newReservation: Reservation = {
      id: body.id || `res_${Date.now()}`,
      room_id: String(body.room_id || '101'),
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

    resList.push(newReservation);
    await writeJson('reservations.json', resList);

    return NextResponse.json(newReservation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const rawReservations = await readJson<Reservation[]>('reservations.json', []);
    const reservations = Array.isArray(rawReservations) ? rawReservations : [];
    const target = reservations.find(r => r && (r.id === id || r.external_id === id));

    // Remove target reservation completely from local and remote canonical array
    const updated = reservations.filter(r => {
      if (!r) return false;
      const match = r.id === id || (target && r.id === target.id) || (target?.external_id && r.external_id === target.external_id);
      return !match;
    });

    // Persist updated reservations.json
    await writeJson('reservations.json', updated);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
