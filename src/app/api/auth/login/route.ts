import { NextResponse } from 'next/server';
import { readJson } from '@/lib/db';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  username: string;
  code: string;
  role: string;
  initials: string;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'u_admin',
    name: 'Administrador Principal',
    email: 'admin@vainillaydescanso.com',
    username: 'admin',
    code: '1234',
    role: 'Administrador',
    initials: 'AD'
  },
  {
    id: 'u_recepcion',
    name: 'Concierge Recepción',
    email: 'recepcion@vainillaydescanso.com',
    username: 'recepcion',
    code: '4321',
    role: 'Recepción',
    initials: 'RC'
  }
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = (body.username || body.email || '').toString().trim().toLowerCase();
    const code = (body.code || body.password || '').toString().trim();

    if (!username || !code) {
      return NextResponse.json(
        { error: 'Por favor ingresa usuario/correo y código de acceso.' },
        { status: 400 }
      );
    }

    let users = await readJson<UserAccount[]>('users.json', DEFAULT_USERS);
    if (!users || !Array.isArray(users) || users.length === 0) {
      users = DEFAULT_USERS;
    }
    
    // Find matching user by username or email and passcode/code
    const user = users.find(u => 
      (u.username.toLowerCase() === username || u.email.toLowerCase() === username) &&
      u.code === code
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario o código de acceso incorrecto.' },
        { status: 401 }
      );
    }

    // Create session token payload
    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      initials: user.initials,
      loggedInAt: new Date().toISOString()
    };

    const token = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    const response = NextResponse.json({ success: true, user: sessionData });
    
    // Set HTTP-Only Cookie valid for 7 days
    response.cookies.set('vd_session_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
