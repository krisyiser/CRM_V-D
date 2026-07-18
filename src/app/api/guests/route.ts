import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const name = (body.name ?? '').trim();

  // Dedup: update existing guest by name (case-insensitive)
  const { data: existing } = await supabase
    .from('guests')
    .select('*')
    .ilike('name', name)
    .limit(1)
    .single();

  if (existing) {
    const updates: Record<string, string> = {};
    if (body.email) updates.email = body.email.trim();
    if (body.phone) updates.phone = body.phone.trim();
    if (body.id_number) updates.id_number = body.id_number.trim();
    if (body.origin) updates.origin = body.origin.trim();

    if (Object.keys(updates).length > 0) {
      await supabase.from('guests').update(updates).eq('id', existing.id);
    }

    const { data: updated } = await supabase
      .from('guests')
      .select('*')
      .eq('id', existing.id)
      .single();

    return NextResponse.json(updated);
  }

  const { data, error } = await supabase
    .from('guests')
    .insert({
      name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      id_number: body.id_number?.trim() || null,
      origin: body.origin?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { id } = await request.json();
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 200 });
}
