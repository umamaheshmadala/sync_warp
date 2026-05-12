export interface Env {
    GOOGLE_SAFE_BROWSING_KEY: string;
    GOOGLE_MAPS_API_KEY: string;
    ALLOWED_ORIGINS: string; // comma-separated: "https://app.sync.com,http://localhost:5173"
}

// CORS headers
function corsHeaders(origin: string, env: Env): Record<string, string> {
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    const isAllowed = allowedOrigins.includes(origin) || origin.startsWith('http://localhost');

    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : '',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '';

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(origin, env),
            });
        }

        // Route: /api/safe-browsing
        if (url.pathname === '/api/safe-browsing' && request.method === 'POST') {
            return handleSafeBrowsing(request, env, origin);
        }

        // Route: /api/places/details
        if (url.pathname === '/api/places/details' && request.method === 'POST') {
            return handlePlacesDetails(request, env, origin);
        }

        return new Response('Not Found', { status: 404 });
    },
};

async function handleSafeBrowsing(
    request: Request,
    env: Env,
    origin: string
): Promise<Response> {
    try {
        const { url: targetUrl } = (await request.json()) as { url: string };

        const response = await fetch(
            `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.GOOGLE_SAFE_BROWSING_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client: { clientId: 'sync-app', clientVersion: '1.0.0' },
                    threatInfo: {
                        threatTypes: [
                            'MALWARE',
                            'SOCIAL_ENGINEERING',
                            'UNWANTED_SOFTWARE',
                            'POTENTIALLY_HARMFUL_APPLICATION',
                        ],
                        platformTypes: ['ANY_PLATFORM'],
                        threatEntryTypes: ['URL'],
                        threatEntries: [{ url: targetUrl }],
                    },
                }),
            }
        );

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders(origin, env),
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders(origin, env),
            },
        });
    }
}

async function handlePlacesDetails(
    request: Request,
    env: Env,
    origin: string
): Promise<Response> {
    try {
        const { placeId, fields } = (await request.json()) as {
            placeId: string;
            fields: string[];
        };

        const fieldMask = fields.join(',');
        const response = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}?fields=${fieldMask}&key=${env.GOOGLE_MAPS_API_KEY}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-FieldMask': fieldMask,
                },
            }
        );

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders(origin, env),
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders(origin, env),
            },
        });
    }
}
