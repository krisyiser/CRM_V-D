import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('check_in', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add computed `dates` field for frontend compatibility
  const withDates = (data ?? []).map(r => ({
    ...r,
    dates: `${r.check_in} - ${r.check_out}`,
  }));

  return NextResponse.json(withDates);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const checkIn = body.check_in || (body.dates?.split(' - ')[0] ?? '');
  const checkOut = body.check_out || (body.dates?.split(' - ')[1] ?? '');
  const guestName = (body.guest_name ?? '').trim();

  // Auto-register guest if not exists
  let guestId = body.guest_id || null;
  if (!guestId && guestName) {
    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .ilike('name', guestName)
      .limit(1)
      .single();

    if (existing) {
      guestId = existing.id;
    } else {
      const { data: newGuest } = await supabase
        .from('guests')
        .insert({ name: guestName, origin: body.origin || 'Lobby' })
        .select('id')
        .single();
      guestId = newGuest?.id ?? null;
    }
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      room_id: body.room_id,
      guest_id: guestId,
      guest_name: guestName,
      check_in: checkIn,
      check_out: checkOut,
      total_price: body.total_price ?? 0,
      notes: body.notes ?? null,
      payment_status: body.payment_status ?? 'paid',
      status: 'Confirmed',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, dates: `${data.check_in} - ${data.check_out}` }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { id } = await request.json();
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 200 });
}
