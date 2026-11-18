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
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const body = req.body || {};
        const to = (body.email || body.to || '').trim().toLowerCase();
        const status = body.status || 'successful';
        const amount = parseFloat(body.amount || body.amount_usd || 10.0);
        const currency = (body.currency || 'USD').toUpperCase();
        const reference = body.reference || body.tx_ref || '';
        const gateway = body.gateway || 'Paystack';
        const reason = body.reason || '';

        if (!to || !to.includes('@')) {
            return res.status(400).json({ success: false, error: 'Valid recipient email required.' });
        }

        const result = await sendPaymentEmail({
            to,
            status,
            amount,
            currency,
            reference,
            gateway,
            reason
        });

        return res.status(200).json(result);
    } catch (err) {
        console.error('[send_receipt error]', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
