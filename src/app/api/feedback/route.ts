import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { Feedback } from '@/types';

export async function GET() {
  const list = await readJson<Feedback[]>('feedback.json', []);
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const list = await readJson<Feedback[]>('feedback.json', []);

    const newFeedback: Feedback = {
      id: body.id || `f_${Date.now()}`,
      guest_name: body.guest_name,
      rating: Number(body.rating),
      comment: body.comment || null,
      created_at: new Date().toISOString(),
    };

    list.unshift(newFeedback);
    await writeJson('feedback.json', list);

    return NextResponse.json(newFeedback);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const list = await readJson<Feedback[]>('feedback.json', []);
    const filtered = list.filter(f => f.id !== id);
    await writeJson('feedback.json', filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
