import { getSession } from './session';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

export async function serverFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const session = await getSession();
  const token = session.accessToken;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let queryStr = '';
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    }
    queryStr = `?${searchParams.toString()}`;
  }

  const url = `${FASTAPI_URL}${endpoint}${queryStr}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store', // Fix: Disable aggressive Next.js fetch caching
    });

    // Check for 401 Unauthorized globally from the server
    if (response.status === 401) {
      console.warn(`[Server API] 401 Unauthorized for ${endpoint}. Session may be invalid.`);
      // We could optionally trigger a logout here, but since this is SSR, we often just throw or fallback.
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      let errDetails = 'Unknown error';
      try {
        const errorBody = await response.json();
        errDetails = JSON.stringify(errorBody);
      } catch (e) {
        errDetails = await response.text();
      }
      throw new Error(`API Error ${response.status}: ${errDetails}`);
    }

    // For 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return await response.json();
  } catch (error) {
    console.error(`[Server API Fetch Error] to ${endpoint}:`, error);
    throw error;
  }
}
