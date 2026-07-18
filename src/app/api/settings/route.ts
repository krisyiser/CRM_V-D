import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('settings').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return as key-value map for frontend convenience
  const map: Record<string, string> = {};
  for (const s of data ?? []) {
    map[s.key] = s.value;
  }
  return NextResponse.json(map);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { key, value } = await request.json();
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
