import { sendOtpEmail } from '../mailer.js';

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
        const email = (body.email || body.to || '').trim().toLowerCase();
        const purpose = (body.purpose || 'login').toLowerCase();

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, error: 'A valid email address is required.' });
        }

        const result = await sendOtpEmail({ to: email, purpose: purpose });
        return res.status(200).json({
            success: true,
            email: email,
            message: 'Verification code sent successfully.'
        });
    } catch (err) {
        console.error('[send_otp error]', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to dispatch verification email.'
        });
    }
}
