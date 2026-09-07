import { getSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] | undefined }> }) {
  try {
    const session = await getSession();
    
    console.log(`[Proxy Debug] ${req.method} → session.accessToken exists: ${!!session.accessToken}, isLoggedIn: ${session.isLoggedIn}`);
    
    // Safety check CSRF if it's a mutation
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      // Stub for strict CSRF - in production validate req.headers.get('X-CSRF-Token')
    }

    const resolvedParams = await params;
    const pathArray = resolvedParams?.path || [];
    let targetPath = pathArray.join('/');
    
    // Preserve trailing slash to avoid strict FastAPI 307 redirects converting POSTs to GETs
    if (req.nextUrl.pathname.endsWith('/') && !targetPath.endsWith('/')) {
      targetPath += '/';
    }
    
    const targetUrl = new URL(`${FASTAPI_URL}/${targetPath}`);
    
    // Append query params naturally
    req.nextUrl.searchParams.forEach((val, key) => {
      targetUrl.searchParams.append(key, val);
    });

    const headers = new Headers();
    
    // Always forward the original Content-Type which includes critical boundaries for multipart
    const incomingContentType = req.headers.get('Content-Type');
    if (incomingContentType) {
       headers.set('Content-Type', incomingContentType);
    }

    const authHeader = session.accessToken ? `Bearer ${session.accessToken}` : null;
    if (authHeader) {
      headers.set('Authorization', authHeader);
      console.log(`[Proxy] Attaching Authorization header for path: ${targetPath}`);
    } else {
      console.warn(`[Proxy] No accessToken found in session for path: ${targetPath}`);
    }
    
    // Add Tracing IDs if missing
    headers.set('X-Request-Correlation-ID', req.headers.get('x-request-id') || crypto.randomUUID());

    // Handle body forwarding for mutation requests
    const options: RequestInit = {
      method: req.method,
      headers,
      cache: 'no-store' // <--- Fix: Prevent Next.js from caching the backend responses!
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const contentType = req.headers.get('Content-Type') || '';
        
        if (contentType.includes('multipart/form-data')) {
          // Parse as Web-Standard FormData and let fetch cleanly re-encode it with a fresh boundary
          const formData = await req.formData();
          options.body = formData;
          headers.delete('content-type'); // Must delete to let fetch auto-generate the new boundary
        } else {
          // For JSON/text: read as text string (avoids detached ArrayBuffer)
          const bodyText = await req.text();
          if (bodyText) {
            options.body = bodyText;
            if (!headers.has('Content-Type')) {
              headers.set('Content-Type', 'application/json');
            }
          }
        }
      } catch {
        // Body may be empty for DELETE requests
      }
    }

    // Targeted fix for endpoints known to have trailing slash issues in FastAPI routers
    let finalUrl = targetUrl.toString();
    if ((targetPath === 'offers' || targetPath === 'applications') && !finalUrl.endsWith('/')) {
      finalUrl += '/';
    }
    
    console.log(`[Proxy] Forwarding to: ${finalUrl}`);
    const backendRes = await fetch(finalUrl, options);
    
    console.log(`[Proxy] Backend Response Status: ${backendRes.status} for ${finalUrl}`);
    console.log(`[Proxy] Backend Response Headers:`, Object.fromEntries(backendRes.headers.entries()));

    // We can't always assume JSON from FastAPI, handle securely
    let data;
    const responseContentType = backendRes.headers.get('content-type');
    if (responseContentType && responseContentType.includes('application/json')) {
      data = await backendRes.json();
    } else {
      data = await backendRes.text();
    }

    // Log non-200 responses for debugging
    if (!backendRes.ok) {
      console.error(`[Proxy] ${req.method} ${targetUrl.toString()} → ${backendRes.status}`, typeof data === 'string' ? data : JSON.stringify(data));
    }

    return new NextResponse(
      typeof data === 'string' ? data : JSON.stringify(data), 
      {
        status: backendRes.status,
        headers: {
          'Content-Type': typeof data === 'string' ? 'text/plain' : 'application/json'
        }
      }
    );

  } catch (error: any) {
    console.error('[API Proxy Error]', error);
    return NextResponse.json({ error: 'BFF Proxy Failure', detail: error?.cause?.message || error?.message || 'Unknown' }, { status: 502 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
