// Se ejecuta antes de cada página: renueva la sesión y manda al login a quien no la tenga.
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login'];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Si faltan las claves en Vercel, se muestra una explicación en vez de un error genérico.
function missingConfig() {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5">
<h2>Falta configurar el panel</h2>
<p>En Vercel → tu proyecto → <b>Settings</b> → <b>Environment Variables</b> deben existir:</p>
<ul><li><code>NEXT_PUBLIC_SUPABASE_URL</code>${SUPABASE_URL ? ' ✅' : ' ❌ falta'}</li>
<li><code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>${SUPABASE_KEY ? ' ✅' : ' ❌ falta'}</li></ul>
<p>Después ve a <b>Deployments</b> → en el último, <b>⋯</b> → <b>Redeploy</b>.</p></body>`;
  return new NextResponse(html, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function proxy(request) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !/^https?:\/\//.test(SUPABASE_URL)) return missingConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!loggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|icons/|manifest.webmanifest|sw.js|robots.txt).*)'],
};
