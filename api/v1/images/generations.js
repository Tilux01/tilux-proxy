export const config = {
    runtime: "edge",
};

export default async function handler(req) {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }

    try {
        // Verify client authorization token
        const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
        const clientToken = authHeader.replace(/^Bearer\s+/i, "").trim();
        const serverSecret = process.env.TILUX_CLIENT_SECRET || "tilux_sec_994b7e8832a1df04";

        const isAuthorized = clientToken === serverSecret || clientToken.startsWith("sk-");
        if (!isAuthorized) {
            return new Response(JSON.stringify({
                error: {
                    message: "Unauthorized: Missing or invalid Tilux client authorization token.",
                    type: "authentication_error"
                }
            }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const TARGET_URL = "https://nano-gpt.com/api/v1/images/generations";
        let apiKey = clientToken.startsWith("sk-") ? clientToken : (process.env.NANOGPT_API_KEY || process.env.GEMINI_API_KEY);

        if (!apiKey) {
            return new Response(JSON.stringify({
                error: "NANOGPT_API_KEY is not configured on the proxy server."
            }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        const bodyText = await req.text();
        const response = await fetch(TARGET_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: bodyText
        });

        const data = await response.text();
        return new Response(data, {
            status: response.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}
