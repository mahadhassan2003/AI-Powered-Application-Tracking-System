import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Call the real FastAPI Backend
    const backendRes = await fetch(`${FASTAPI_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      // Return normalized error
      return NextResponse.json(
        { error: data.detail || 'Authentication failed' },
        { status: backendRes.status }
      );
    }

    // 2. Encryption & Server Storage via Iron Session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore as any, sessionOptions);

    session.accessToken = data.access_token;
    session.user = data.user;
    session.isLoggedIn = true;

    await session.save();

    // 3. Return sanitized response to client (NO JWT INCLUDED)
    return NextResponse.json({
      success: true,
      user: data.user,
    });

  } catch (error: any) {
    console.error('[BFF Login Error]', error);
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
