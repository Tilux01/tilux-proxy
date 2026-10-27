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

        const bodyText = await req.text();
        let bodyJson = {};
        try {
            bodyJson = JSON.parse(bodyText);
        } catch (_) {}

        const model = (bodyJson.model || "").toLowerCase();
        const isVisionOrGemini = model.includes("gemini") || model.startsWith("google/") || model.includes("nano");

        let targetUrl = "https://api.deepseek.com/v1/chat/completions";
        let apiKey = process.env.DEEPSEEK_API_KEY;

        if (isVisionOrGemini) {
            targetUrl = "https://nano-gpt.com/api/v1/chat/completions";
            apiKey = process.env.NANOGPT_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey && !clientToken.startsWith("sk-")) {
                return new Response(JSON.stringify({
                    error: {
                        message: "NANOGPT_API_KEY or GEMINI_API_KEY is not configured on the proxy server for vision requests.",
                        type: "proxy_configuration_error"
                    }
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }
        } else {
            if (!apiKey && !clientToken.startsWith("sk-")) {
                return new Response(JSON.stringify({
                    error: {
                        message: "DEEPSEEK_API_KEY is not configured on the proxy server.",
                        type: "proxy_configuration_error"
                    }
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }
        }

        if (clientToken.startsWith("sk-")) {
            apiKey = clientToken;
        }

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: bodyText
        });

        return new Response(response.body, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache, no-transform"
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({
            error: {
                message: `Proxy Error: ${e.message}`,
                type: "proxy_internal_error"
            }
        }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
    }
}
