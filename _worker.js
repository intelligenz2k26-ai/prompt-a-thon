/**
 * CLOUDFLARE WORKER NATIVE KV BACKEND
 * Connects directly to Cloudflare KV for guaranteed global realtime sync across all devices.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Unified Realtime Shared Participants API (backed by Cloudflare KV)
    if (url.pathname === '/api/participants') {
      if (request.method === 'GET') {
        try {
          let data = null;
          if (env.PROMPT_DATA) {
            data = await env.PROMPT_DATA.get('participants', { type: 'json' });
          }
          if (!Array.isArray(data)) data = [];
          return new Response(JSON.stringify(data), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
        } catch (err) {
          return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (Array.isArray(body) && env.PROMPT_DATA) {
            await env.PROMPT_DATA.put('participants', JSON.stringify(body));
          }
          return new Response(JSON.stringify({ success: true, count: Array.isArray(body) ? body.length : 0 }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }
    }

    // Clean URL Rewrite: /admin and /admin/ -> admin.html
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      url.pathname = '/admin.html';
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    // Serve Static Assets (HTML, CSS, JS, Images)
    return env.ASSETS.fetch(request);
  }
};
