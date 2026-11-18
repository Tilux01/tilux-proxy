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
        const reference = data.reference;
        const email = data.email || '';
        const amount_usd = parseFloat(data.amount_usd || 10.0);

        if (!reference) {
            return res.status(400).json({ status: 'error', message: 'Missing payment reference' });
        }

        let verified = false;
        let isFailed = false;
        let failReason = '';
        let customerEmail = email;

        if (gateway === 'paystack') {
            const secret_key = process.env.PAYSTACK_SECRET_KEY;
            if (secret_key) {
                const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${secret_key}` }
                });
                const res_json = await r.json();
                if (res_json.status && res_json.data?.status === 'success') {
                    verified = true;
                    if (!customerEmail && res_json.data?.customer?.email) {
                        customerEmail = res_json.data.customer.email;
                    }
                } else if (res_json.data?.status === 'failed' || res_json.data?.status === 'abandoned') {
                    isFailed = true;
                    failReason = res_json.data?.gateway_response || 'Transaction failed or abandoned.';
                    if (!customerEmail && res_json.data?.customer?.email) {
                        customerEmail = res_json.data.customer.email;
                    }
                }
            }
        } else if (gateway === 'flutterwave') {
            const secret_key = process.env.FLUTTERWAVE_SECRET_KEY;
            if (secret_key) {
                const r = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${secret_key}` }
                });
                const res_json = await r.json();
                if (res_json.status === 'success' && res_json.data?.status === 'successful') {
                    verified = true;
                    if (!customerEmail && res_json.data?.customer?.email) {
                        customerEmail = res_json.data.customer.email;
                    }
                } else if (res_json.data?.status === 'failed') {
                    isFailed = true;
                    failReason = res_json.data?.processor_response || 'Transaction failed.';
                    if (!customerEmail && res_json.data?.customer?.email) {
                        customerEmail = res_json.data.customer.email;
                    }
                }
            }
        }

        // Send delivery receipt email
        if (verified) {
            if (customerEmail && customerEmail.includes('@')) {
                sendPaymentEmail({
                    to: customerEmail,
                    status: 'successful',
                    amount: amount_usd,
                    currency: 'USD',
                    reference: reference,
                    gateway: gateway
                }).catch(err => console.warn('[Payment Success Email Notice]', err));
            }
            return res.status(200).json({ status: 'success', message: 'Payment verified.' });
        } else if (isFailed) {
            if (customerEmail && customerEmail.includes('@')) {
                sendPaymentEmail({
                    to: customerEmail,
                    status: 'failed',
                    amount: amount_usd,
                    currency: 'USD',
                    reference: reference,
                    gateway: gateway,
                    reason: failReason
                }).catch(err => console.warn('[Payment Failed Email Notice]', err));
            }
            return res.status(400).json({ status: 'failed', message: failReason || 'Payment failed.' });
        } else {
            return res.status(400).json({ status: 'pending', message: 'Transaction unverified or pending.' });
        }
    } catch (e) {
        return res.status(500).json({ status: 'error', message: e.message });
    }
}
