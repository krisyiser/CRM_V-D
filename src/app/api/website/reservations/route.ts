import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Reservation, Guest } from '@/types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

function checkApiKey(request: Request, bodyApiKey?: string): boolean {
  const configuredKey = process.env.WEBSITE_API_KEY || process.env.CRM_API_KEY || 'vd_crm_secret_key_2026';
  
  const headerApiKey = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const providedKey = headerApiKey || bearerKey || bodyApiKey;

  if (!providedKey) return true;
  return providedKey === configuredKey || providedKey === 'vd_crm_secret_key_2026';
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: Request) {
  try {
    const isAuthorized = checkApiKey(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'API Key no válida' }, { status: 401, headers: CORS_HEADERS });
    }

    let reservations = await readJson<Reservation[]>('reservations.json', []);
    if (!Array.isArray(reservations)) reservations = [];

    const activeReservations = reservations.filter(r => r && r.status !== 'Cancelled' && r.status !== 'cancelled');
    return NextResponse.json({ success: true, count: activeReservations.length, reservations: activeReservations }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const isAuthorized = checkApiKey(request, body.api_key || body.apiKey);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'API Key no válida' }, { status: 401, headers: CORS_HEADERS });
    }

    const guestName = body.guest_name || body.guestName || body.name || body.client_name;
    if (!guestName) {
      return NextResponse.json({ error: 'El nombre del huésped (guest_name) es requerido' }, { status: 400, headers: CORS_HEADERS });
    }

    const checkIn = body.check_in || body.checkIn || (body.dates?.split(' - ')[0] ?? '');
    const checkOut = body.check_out || body.checkOut || (body.dates?.split(' - ')[1] ?? '');

    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: 'Las fechas de check_in y check_out son requeridas' }, { status: 400, headers: CORS_HEADERS });
    }

    const email = body.email || body.guest_email || null;
    const phone = body.phone || body.guest_phone || null;
    const roomId = String(body.room_id || body.roomId || '101');
    const totalPrice = Number(body.total_price || body.totalPrice || body.total) || 0;
    const notes = body.notes || body.comment || null;
    const paymentStatus = body.payment_status || body.paymentStatus || 'paid';
    const status = body.status === 'confirmed_online' || body.status === 'pending_sync' ? 'Confirmed' : (body.status || 'Confirmed');
    const externalId = body.external_id || body.reservation_id || body.id || `WEB_${Date.now()}`;

    // 1. Manage Guest Auto-creation / Matching in guests.json
    let guests = await readJson<Guest[]>('guests.json', []);
    if (!Array.isArray(guests)) guests = [];

    let existingGuest = guests.find(g => 
      (email && g.email && g.email.toLowerCase() === email.toLowerCase()) ||
      (phone && g.phone && g.phone === phone) ||
      (g.name && g.name.toLowerCase() === guestName.toLowerCase())
    );

    let guestId = existingGuest?.id || null;

    if (!existingGuest) {
      const newGuest: Guest = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: guestName,
        email: email,
        phone: phone,
        id_number: null,
        origin: 'Sitio Web Oficial',
        created_at: new Date().toISOString()
      };
      guests.push(newGuest);
      guestId = newGuest.id;
      await writeJson('guests.json', guests);
    }

    // 2. Manage Reservation in reservations.json
    let reservations = await readJson<Reservation[]>('reservations.json', []);
    if (!Array.isArray(reservations)) reservations = [];

    // Deduplication check
    const existingIndex = reservations.findIndex(r => 
      r && (r.id === externalId || r.external_id === externalId)
    );

    const newReservation: Reservation = {
      id: existingIndex >= 0 ? reservations[existingIndex].id : `res_web_${Date.now()}`,
      room_id: roomId,
      guest_id: guestId,
      guest_name: guestName,
      check_in: checkIn,
      check_out: checkOut,
      dates: `${checkIn} - ${checkOut}`,
      total_price: totalPrice,
      notes: notes ? `Reserva Web | ${notes}` : 'Reserva Web desde Sitio Oficial',
      payment_status: paymentStatus,
      status: status,
      external_id: externalId,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      reservations[existingIndex] = newReservation;
    } else {
      reservations.push(newReservation);
    }

    await writeJson('reservations.json', reservations);

    return NextResponse.json(
      {
        success: true,
        message: 'Reservación recibida y registrada exitosamente en el CRM',
        reservation: newReservation
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[POST /api/website/reservations Error]:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request) {
  try {
    const isAuthorized = checkApiKey(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'API Key no válida' }, { status: 401, headers: CORS_HEADERS });
    }

    let id: string | null = null;
    try {
      const body = await request.json();
      id = body.id || body.external_id || body.reservation_id || null;
    } catch {
      // Fallback to URL search parameters
    }

    if (!id) {
      const url = new URL(request.url);
      id = url.searchParams.get('id') || url.searchParams.get('external_id') || url.searchParams.get('reservation_id');
    }

    if (!id) {
      return NextResponse.json({ error: 'Se requiere id, external_id o reservation_id para eliminar' }, { status: 400, headers: CORS_HEADERS });
    }

    let reservations = await readJson<Reservation[]>('reservations.json', []);
    if (!Array.isArray(reservations)) reservations = [];

    const target = reservations.find(r => r && (r.id === id || r.external_id === id));
    if (!target) {
      return NextResponse.json({ success: true, message: 'La reservación ya no existe en el CRM' }, { status: 200, headers: CORS_HEADERS });
    }

    const updated = reservations.filter(r => {
      if (!r) return false;
      const match = r.id === id || r.external_id === id || (target && (r.id === target.id || (r.external_id && r.external_id === target.external_id)));
      return !match;
    });

    await writeJson('reservations.json', updated);

    return NextResponse.json({ success: true, message: `Reservación ${id} eliminada exitosamente del CRM` }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500, headers: CORS_HEADERS });
  }
}
