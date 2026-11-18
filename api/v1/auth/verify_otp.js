import { verifyOtpFromFirebase } from '../mailer.js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        return res.status(204).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        return res.status(405).json({ valid: false, message: 'Method not allowed' });
    }

    try {
        const body = req.body || {};
        const email = (body.email || '').trim().toLowerCase();
        const code = String(body.code || body.otp || '').trim();

        if (!email || !code) {
            return res.status(400).json({ valid: false, message: 'Email and verification code are required.' });
        }

        const result = await verifyOtpFromFirebase(email, code);
        return res.status(200).json(result);
    } catch (err) {
        console.error('[verify_otp error]', err);
        return res.status(500).json({
            valid: false,
            message: err.message || 'Verification check failed.'
        });
    }
}
