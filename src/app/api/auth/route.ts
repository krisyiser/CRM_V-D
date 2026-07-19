import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json().catch(() => ({ email: 'admin@vainilla.com' }));
    return NextResponse.json({
      user: {
        id: 'admin-user',
        email: email || 'admin@vainilla.com',
        user_metadata: { name: 'Recepción Vainilla' }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
