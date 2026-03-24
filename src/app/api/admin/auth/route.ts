import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSession } from '@/lib/auth';

const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(request: NextRequest): Promise<NextResponse> {
  let email: string;
  let password: string;

  try {
    const body = await request.json();
    email = body.email;
    password = body.password;
  } catch {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const valid = await verifyCredentials(email, password);

  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = createSession();

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
