import { sendPaymentEmail } from '../mailer.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        return res.status(204).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    try {
        const data = req.body || {};
        const gateway = (data.gateway || 'paystack').toLowerCase();
        const amount_usd = parseFloat(data.amount_usd || 10.0);
        const email = data.email || 'user@mail.com';
        const currency = (data.currency || 'USD').toUpperCase();
        const reference = data.reference;
        const callback_url = 'https://paystack.com';

        if (gateway === 'paystack') {
            const secret_key = process.env.PAYSTACK_SECRET_KEY;
            if (!secret_key) return res.status(500).json({ status: 'error', message: 'PAYSTACK_SECRET_KEY not set on proxy' });

            const initPaystack = async (curr, amt_val) => {
                const amt_kobo = curr === 'NGN' ? Math.floor(amt_val * 1000 * 100) : Math.floor(amt_val * 100);
                const r = await fetch('https://api.paystack.co/transaction/initialize', {
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
                return await r.json();
            };

            let res_json = await initPaystack(currency, amount_usd);
            if (!res_json.status && currency === 'USD') {
                res_json = await initPaystack('NGN', amount_usd);
            }

            if (res_json.status) {
                // Send pending payment receipt email
                if (email && email.includes('@')) {
                    try {
                        await sendPaymentEmail({
                            to: email,
                            status: 'pending',
                            amount: amount_usd,
                            currency: currency,
                            reference: reference,
                            gateway: 'Paystack'
                        });
                    } catch (err) {
                        console.warn('[Payment Init Email Notice]', err);
                    }
                }

                return res.status(200).json({
                    status: 'success',
                    checkout_url: res_json.data.authorization_url,
                    reference: reference,
                    gateway: 'paystack'
                });
            } else {
                return res.status(400).json({ status: 'error', message: res_json.message });
            }

        } else if (gateway === 'flutterwave') {
            const secret_key = process.env.FLUTTERWAVE_SECRET_KEY;
            if (!secret_key) return res.status(500).json({ status: 'error', message: 'FLUTTERWAVE_SECRET_KEY not set on proxy' });

            const r = await fetch('https://api.flutterwave.com/v3/payments', {
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

            const res_json = await r.json();
            if (res_json.status === 'success') {
                if (email && email.includes('@')) {
                    try {
                        await sendPaymentEmail({
                            to: email,
                            status: 'pending',
                            amount: amount_usd,
                            currency: currency,
                            reference: reference,
                            gateway: 'Flutterwave'
                        });
                    } catch (err) {
                        console.warn('[Payment Init Email Notice]', err);
                    }
                }

                return res.status(200).json({
                    status: 'success',
                    checkout_url: res_json.data.link,
                    reference: reference,
                    gateway: 'flutterwave'
                });
            } else {
                return res.status(400).json({ status: 'error', message: res_json.message });
            }
        }

        return res.status(400).json({ status: 'error', message: 'Unsupported gateway' });
    } catch (e) {
        return res.status(500).json({ status: 'error', message: e.message });
    }
}
