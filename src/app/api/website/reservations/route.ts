import { NextResponse } from 'next/server';
import { readJson, registerDeletedReservationId, deleteWebsiteReservationFromGitHub, updateJsonTransactional } from '@/lib/db';
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

const VALID_ROOM_IDS = ['101', '102', '103', '104', '105'];

function normalizeRoomId(input: any): string {
  const str = String(input || '').trim().toLowerCase();
  if (VALID_ROOM_IDS.includes(str)) return str;

  const MAPPINGS: Record<string, string> = {
    '201': '101',
    '202': '102',
    '203': '103',
    '204': '104',
    '205': '105',
    '1': '101',
    '2': '102',
    '3': '103',
    '4': '104',
    '5': '105',
    'moros': '101',
    'volador': '102',
    'guagua': '103',
    'negritos': '104',
    'santiagueros': '105',
  };

  for (const [key, val] of Object.entries(MAPPINGS)) {
    if (str.includes(key)) return val;
  }

  return '101';
}

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
    const rawRoomId = body.room_id || body.roomId || body.suite_id || '101';
    const roomId = normalizeRoomId(rawRoomId);

    const totalPrice = Number(body.total_price || body.totalPrice || body.total) || 0;
    const notes = body.notes || body.comment || null;
    const paymentStatus = body.payment_status || body.paymentStatus || 'paid';
    const status = body.status === 'confirmed_online' || body.status === 'pending_sync' ? 'Confirmed' : (body.status || 'Confirmed');
    const externalId = body.external_id || body.reservation_id || body.id || `WEB_${Date.now()}`;

    // 1. Manage Guest Auto-creation / Matching in guests.json
    let guestId: string | null = null;
    await updateJsonTransactional<Guest[]>(
      'guests.json',
      (guests) => {
        const list = Array.isArray(guests) ? guests : [];
        let existingGuest = list.find(g => 
          (email && g.email && g.email.toLowerCase() === email.toLowerCase()) ||
          (phone && g.phone && g.phone === phone) ||
          (g.name && g.name.toLowerCase() === guestName.toLowerCase())
        );

        if (existingGuest) {
          guestId = existingGuest.id;
          return list;
        } else {
          const newGuest: Guest = {
            id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: guestName,
            email: email,
            phone: phone,
            id_number: null,
            origin: 'Sitio Web Oficial',
            created_at: new Date().toISOString()
          };
          guestId = newGuest.id;
          return [...list, newGuest];
        }
      },
      []
    );

    // 2. Manage Reservation in reservations.json
    let newReservation: Reservation | null = null;
    await updateJsonTransactional<Reservation[]>(
      'reservations.json',
      (reservations) => {
        const list = Array.isArray(reservations) ? reservations : [];
        const existingIndex = list.findIndex(r => 
          r && (r.id === externalId || r.external_id === externalId)
        );

        newReservation = {
          id: existingIndex >= 0 ? list[existingIndex].id : `res_web_${Date.now()}`,
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

        const updatedList = [...list];
        if (existingIndex >= 0) {
          updatedList[existingIndex] = newReservation;
        } else {
          updatedList.push(newReservation);
        }
        return updatedList;
      },
      []
    );

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
      return NextResponse.json({ error: 'Se requiere id, external_id o reservation_id para eliminar' }, { status: 400, headers: CORS_HEADERS });
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
        message: `Reservación ${rawId} eliminada exitosamente del CRM`
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500, headers: CORS_HEADERS });
  }
}
