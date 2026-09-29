export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    // Determine target API from environment or request. Defaulting to DeepSeek here.
    const TARGET_URL = 'https://api.deepseek.com/v1/chat/completions';
    
    // Grab the secret key from the Vercel dashboard environment variables
    const API_KEY = process.env.DEEPSEEK_API_KEY; 

    if (!API_KEY) {
        return new Response('API_KEY is not configured on the server.', { status: 500 });
    }

    try {
        const body = await req.text();

        const response = await fetch(TARGET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: body
        });

        // Simply pipe the stream (with SSE intact) back to the client!
        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-transform'
            }
        });
    } catch (e) {
        return new Response(`Proxy Error: ${e.message}`, { status: 500 });
    }
}
