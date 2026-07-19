import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';

export async function GET() {
  const settings = await readJson<Record<string, string>>('settings.json', { is_high_season: 'false' });
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = await readJson<Record<string, string>>('settings.json', { is_high_season: 'false' });
    const updated = { ...settings, ...body };
    await writeJson('settings.json', updated);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
