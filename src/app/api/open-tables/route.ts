import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';

export async function GET() {
  const openTables = await readJson<any[]>('open_tables.json', []);
  return NextResponse.json(openTables);
}

export async function POST(request: Request) {
  try {
    const openTables = await request.json();
    await writeJson('open_tables.json', openTables);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
