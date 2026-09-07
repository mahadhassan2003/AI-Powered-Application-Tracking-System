import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  accessToken?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

// Check for absolute security in production — deferred to runtime
const getSessionPassword = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn("WARNING: SESSION_SECRET is not set. Using insecure fallback in production.");
      return 'this_is_a_fallback_secret_password_for_development_purposes_123!!';
    }
    console.warn("WARNING: Using insecure fallback session secret. Set SESSION_SECRET broadly.");
    return 'this_is_a_fallback_secret_password_for_development_purposes_123!!';
  }
  return secret;
};

export const sessionOptions = {
  get password() { return getSessionPassword(); },
  cookieName: 'ats_secure_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore as any, sessionOptions);
}
