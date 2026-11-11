export const config = {
    runtime: "edge",
};

// Edge In-Memory Cache: Caches verified host quota for 60 seconds to ensure 0ms added latency
const quotaCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

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
        // 1. Verify strict Tilux client authorization token
        const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
        const clientToken = authHeader.replace(/^Bearer\s+/i, "").trim();
        const serverSecret = process.env.TILUX_CLIENT_SECRET || "tilux_sec_994b7e8832a1df04";

        if (clientToken !== serverSecret) {
            return new Response(JSON.stringify({
                error: {
                    message: "Unauthorized: Invalid Tilux client authorization token.",
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

        // 2. Ultra-Fast Quota Check with Edge Memory Cache (0ms latency on repeated turns)
        const hostId = req.headers.get("x-tilux-host-id") || req.headers.get("X-Tilux-Host-Id") || bodyJson.host_id || "";
        const fbBase = (process.env.FIREBASE_DB_URL || "https://tiluxasm-default-rtdb.firebaseio.com").replace(/\/$/, "");
        const fbSecret = process.env.FIREBASE_DB_SECRET || "";
        const authParam = fbSecret ? `?auth=${fbSecret}` : "";

        let usage = null;
        let isTrialValid = false;
        let walletBalance = 0.0;
        let trialCostUsd = 0.0;
        let trialMaxUsd = 1.00;

        if (isTiluxSecret && hostId) {
            const nowMs = Date.now();
            const cached = quotaCache.get(hostId);

            if (cached && (nowMs - cached.timestamp < CACHE_TTL_MS)) {
                // Instant cache hit: 0ms Firebase roundtrip!
                usage = cached.usage;
                isTrialValid = cached.isTrialValid;
                walletBalance = cached.walletBalance;
                trialCostUsd = cached.trialCostUsd;
                trialMaxUsd = cached.trialMaxUsd;
            } else {
                try {
                    const usageRes = await fetch(`${fbBase}/hosts/${hostId}/usage.json${authParam}`);
                    if (usageRes.ok) {
                        usage = await usageRes.json();
                    }
                } catch (_) {}

                const nowSec = Math.floor(nowMs / 1000);
                if (!usage || typeof usage !== "object") {
                    usage = {
                        account_created_at: nowSec,
                        trial_ends_at: nowSec + 86400,
                        trial_max_usd: 1.00,
                        trial_cost_usd: 0.0,
                        wallet_balance_usd: 0.00,
                        total_tokens: 0,
                        total_cost_usd: 0.0,
                        last_updated: nowSec
                    };
                    fetch(`${fbBase}/hosts/${hostId}/usage.json${authParam}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(usage)
                    }).catch(() => {});
                }

                const trialEndsAt = usage.trial_ends_at || 0;
                trialMaxUsd = parseFloat(usage.trial_max_usd !== undefined ? usage.trial_max_usd : 1.00);
                trialCostUsd = parseFloat(usage.trial_cost_usd || 0.0);
                isTrialValid = (nowSec < trialEndsAt) && (trialCostUsd < trialMaxUsd);
                walletBalance = parseFloat(usage.wallet_balance_usd || 0.0);

                quotaCache.set(hostId, {
                    timestamp: nowMs,
                    usage,
                    isTrialValid,
                    walletBalance,
                    trialCostUsd,
                    trialMaxUsd
                });
            }

            // Server-Side Hard Block: Reject request if trial expired and balance is zero
            if (!isTrialValid && walletBalance <= 0) {
                return new Response(JSON.stringify({
                    error: {
                        message: "Payment Required: Your 24-hour free trial has ended and your wallet balance is $0.00. Please top up your wallet in Tilux Settings to continue.",
                        type: "insufficient_quota",
                        code: 402
                    }
                }), {
                    status: 402,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                });
            }
        }

        // 3. Upstream Routing
        let targetUrl = "https://api.deepseek.com/v1/chat/completions";
        let apiKey = process.env.DEEPSEEK_API_KEY;

        if (isVisionOrGemini) {
            targetUrl = "https://nano-gpt.com/api/v1/chat/completions";
            apiKey = process.env.NANOGPT_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
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
            if (!apiKey) {
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

        const isStream = Boolean(bodyJson.stream);
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: bodyText
        });

        // 4. Pass-through stream if streaming requested
        if (isStream) {
            return new Response(response.body, {
                status: response.status,
                headers: {
                    "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache, no-transform"
                }
            });
        }

        // 5. Non-streaming: Server-Side Token Calculation & Background Wallet Deduction
        const resText = await response.text();
        let resJson = null;
        try {
            resJson = JSON.parse(resText);
        } catch (_) {}

        if (response.ok && resJson && resJson.usage && isTiluxSecret && hostId && usage) {
            const promptTok = resJson.usage.prompt_tokens || 0;
            const compTok = resJson.usage.completion_tokens || 0;
            const cacheHitTok = resJson.usage.prompt_cache_hit_tokens || 0;
            const cacheMissTok = resJson.usage.prompt_cache_miss_tokens || (promptTok - cacheHitTok);

            let turnCost = 0.0;
            if (isVisionOrGemini) {
                turnCost = (promptTok / 1e6) * 1.125 + (compTok / 1e6) * 5.625;
            } else {
                turnCost = (cacheMissTok / 1e6) * 0.28 + (cacheHitTok / 1e6) * 0.028 + (compTok / 1e6) * 0.56;
            }
            turnCost = Math.max(turnCost, 0.000001);

            // Deduct turn cost from trial or wallet
            if (isTrialValid && trialCostUsd < trialMaxUsd) {
                const coveredByTrial = Math.min(turnCost, trialMaxUsd - trialCostUsd);
                usage.trial_cost_usd = Math.round((trialCostUsd + coveredByTrial) * 1e6) / 1e6;
                const remainingCost = turnCost - coveredByTrial;
                if (remainingCost > 0) {
                    usage.wallet_balance_usd = Math.max(0, Math.round((walletBalance - remainingCost) * 1e6) / 1e6);
                }
            } else {
                usage.wallet_balance_usd = Math.max(0, Math.round((walletBalance - turnCost) * 1e6) / 1e6);
            }
            usage.total_tokens = (usage.total_tokens || 0) + promptTok + compTok;
            usage.total_cost_usd = Math.round(((usage.total_cost_usd || 0) + turnCost) * 1e6) / 1e6;
            usage.last_updated = Math.floor(Date.now() / 1000);

            // Update edge memory cache
            quotaCache.set(hostId, {
                timestamp: Date.now(),
                usage,
                isTrialValid,
                walletBalance: usage.wallet_balance_usd,
                trialCostUsd: usage.trial_cost_usd,
                trialMaxUsd
            });

            // Asynchronous non-blocking write to Firebase (never delays the response to user)
            fetch(`${fbBase}/hosts/${hostId}/usage.json${authParam}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(usage)
            }).catch(() => {});
        }

        return new Response(resText, {
            status: response.status,
            headers: {
                "Content-Type": "application/json",
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
