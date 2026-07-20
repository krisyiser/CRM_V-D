import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('vd_session_token');
  response.cookies.set('vd_session_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    expires: new Date(0)
  });
  return response;
}
