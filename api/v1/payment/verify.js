export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const data = await req.json();
        const gateway = (data.gateway || 'paystack').toLowerCase();
        const reference = data.reference;

        if (!reference) {
            return new Response(JSON.stringify({ status: 'error', message: 'Missing payment reference' }), { status: 400 });
        }

        let verified = false;

        if (gateway === 'paystack') {
            const secret_key = process.env.PAYSTACK_SECRET_KEY;
            if (secret_key) {
                const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${secret_key}` }
                });
                const res_json = await res.json();
                if (res_json.status && res_json.data?.status === 'success') {
                    verified = true;
                }
            }
        } else if (gateway === 'flutterwave') {
            const secret_key = process.env.FLUTTERWAVE_SECRET_KEY;
            if (secret_key) {
                const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${secret_key}` }
                });
                const res_json = await res.json();
                if (res_json.status === 'success' && res_json.data?.status === 'successful') {
                    verified = true;
                }
            }
        }

        if (verified) {
            return new Response(JSON.stringify({ status: 'success', message: 'Payment verified.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            return new Response(JSON.stringify({ status: 'pending', message: 'Transaction unverified or pending.' }), { status: 400 });
        }
    } catch (e) {
        return new Response(JSON.stringify({ status: 'error', message: e.message }), { status: 500 });
    }
}
