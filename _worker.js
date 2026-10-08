/**
 * CLOUDFLARE WORKER BACKEND ROUTER & REALTIME DATA ENGINE
 * Handles same-origin API (/api/participants), routing (/admin -> admin.html), and static assets.
 */

let memoryParticipants = [];
const BACKUP_KV_URL = 'https://kvdb.io/7WSqXoKQGY5BLvRnc6bmqT/participants';

async function hydrateBackup() {
  try {
    const res = await fetch(BACKUP_KV_URL + '?_t=' + Date.now(), {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        memoryParticipants = data;
      }
    }
  } catch (e) {
    console.error('Hydrate error:', e);
  }
}

async function persistBackup(list) {
  try {
    await fetch(BACKUP_KV_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    });
  } catch (e) {
    console.error('Persist error:', e);
  }
}

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

    // Unified Realtime Shared Participants API
    if (url.pathname === '/api/participants') {
      if (request.method === 'GET') {
        if (memoryParticipants.length === 0) {
          await hydrateBackup();
        }
        return new Response(JSON.stringify(memoryParticipants), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          if (Array.isArray(body)) {
            memoryParticipants = body;
            if (ctx && ctx.waitUntil) {
              ctx.waitUntil(persistBackup(body));
            } else {
              persistBackup(body);
            }
          }
          return new Response(JSON.stringify({ success: true, count: memoryParticipants.length }), {
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

    // Clean URL Rewrite: /admin and /admin/ -> admin.html (No redirect loop!)
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      url.pathname = '/admin.html';
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    // Serve Static Assets (HTML, CSS, JS, Images)
    return env.ASSETS.fetch(request);
  }
};
