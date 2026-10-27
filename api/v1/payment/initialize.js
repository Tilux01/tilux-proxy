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
        const amount_usd = parseFloat(data.amount_usd || 10.0);
        const email = data.email || 'user@mail.com';
        const currency = (data.currency || 'USD').toUpperCase();
        const reference = data.reference;

        const callback_url = 'https://paystack.com';

        if (gateway === 'paystack') {
            const secret_key = process.env.PAYSTACK_SECRET_KEY;
            if (!secret_key) return new Response(JSON.stringify({ status: 'error', message: 'PAYSTACK_SECRET_KEY not set on proxy' }), { status: 500 });

            const initPaystack = async (curr, amt_val) => {
                const amt_kobo = curr === 'NGN' ? Math.floor(amt_val * 1000 * 100) : Math.floor(amt_val * 100);
                const res = await fetch('https://api.paystack.co/transaction/initialize', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${secret_key}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        amount: amt_kobo,
                        currency: curr,
                        reference: reference,
                        callback_url: callback_url
                    })
                });
                return await res.json();
            };

            let res_json = await initPaystack(currency, amount_usd);
            if (!res_json.status && currency === 'USD') {
                // fallback to NGN
                res_json = await initPaystack('NGN', amount_usd);
            }

            if (res_json.status) {
                return new Response(JSON.stringify({
                    status: 'success',
                    checkout_url: res_json.data.authorization_url,
                    reference: reference,
                    gateway: 'paystack'
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } else {
                return new Response(JSON.stringify({ status: 'error', message: res_json.message }), { status: 400 });
            }

        } else if (gateway === 'flutterwave') {
            const secret_key = process.env.FLUTTERWAVE_SECRET_KEY;
            if (!secret_key) return new Response(JSON.stringify({ status: 'error', message: 'FLUTTERWAVE_SECRET_KEY not set on proxy' }), { status: 500 });

            const res = await fetch('https://api.flutterwave.com/v3/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secret_key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tx_ref: reference,
                    amount: amount_usd.toString(),
                    currency: currency,
                    redirect_url: callback_url,
                    customer: { email: email },
                    customizations: {
                        title: 'Tilux ASM Wallet Top-Up',
                        description: `Funding $${amount_usd.toFixed(2)} to Tilux AI Wallet`
                    }
                })
            });

            const res_json = await res.json();
            if (res_json.status === 'success') {
                return new Response(JSON.stringify({
                    status: 'success',
                    checkout_url: res_json.data.link,
                    reference: reference,
                    gateway: 'flutterwave'
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } else {
                return new Response(JSON.stringify({ status: 'error', message: res_json.message }), { status: 400 });
            }
        }

        return new Response(JSON.stringify({ status: 'error', message: 'Unsupported gateway' }), { status: 400 });
    } catch (e) {
        return new Response(JSON.stringify({ status: 'error', message: e.message }), { status: 500 });
    }
}
