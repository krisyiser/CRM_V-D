import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Notification } from '@/types';

export async function GET() {
  const notifications = await readJson<Notification[]>('notifications.json', []);
  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();
    const notifications = await readJson<Notification[]>('notifications.json', []);
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    await writeJson('notifications.json', updated);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
