import nodemailer from 'nodemailer';

const DEFAULT_EMAIL_USER = 'tilux001@gmail.com';
const DEFAULT_EMAIL_PASS = 'worntpimvltcaeyj';

export function sanitizeEmailKey(email) {
    return (email || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function getTransporter() {
    const user = (process.env.EMAIL_USER || process.env.SMTP_USER || DEFAULT_EMAIL_USER).trim();
    const rawPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || DEFAULT_EMAIL_PASS;
    const pass = rawPass.replace(/\s+/g, '').trim();
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

    if (host) {
        return nodemailer.createTransport({
            host: host,
            port: port,
            secure: port === 465,
            auth: { user, pass }
        });
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
}

export async function saveOtpToFirebase(email, otp, purpose = 'verification') {
    try {
        const emailKey = sanitizeEmailKey(email);
        const now = Math.floor(Date.now() / 1000);
        const record = {
            code: String(otp),
            email: email,
            purpose: purpose,
            created_at: now,
            expires_at: now + 600 // 10 minutes
        };

        const fbSecret = process.env.FIREBASE_DB_SECRET || '';
        const authParam = fbSecret ? `?auth=${fbSecret}` : '';
        const url = `https://tiluxasm-default-rtdb.firebaseio.com/hosts/otp_${emailKey}/settings.json${authParam}`;

        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        return res.ok;
    } catch (err) {
        console.warn('[Proxy Mailer] Firebase OTP save notice:', err.message);
        return false;
    }
}

export async function verifyOtpFromFirebase(email, enteredCode) {
    try {
        const emailKey = sanitizeEmailKey(email);
        const fbSecret = process.env.FIREBASE_DB_SECRET || '';
        const authParam = fbSecret ? `?auth=${fbSecret}` : '';
        const url = `https://tiluxasm-default-rtdb.firebaseio.com/hosts/otp_${emailKey}/settings.json${authParam}`;

        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
            return { valid: false, message: 'Could not access verification server.' };
        }
        const record = await res.json();
        if (!record || !record.code) {
            return { valid: false, message: 'No OTP found or code expired. Please request a new one.' };
        }

        const now = Math.floor(Date.now() / 1000);
        if (record.expires_at && now > record.expires_at) {
            return { valid: false, message: 'OTP has expired. Please request a new code.' };
        }

        if (String(record.code).trim() === String(enteredCode).trim()) {
            fetch(url, { method: 'DELETE' }).catch(() => {});
            return { valid: true };
        }

        return { valid: false, message: 'Incorrect verification code. Please check and try again.' };
    } catch (err) {
        return { valid: false, message: 'Network error checking OTP: ' + err.message };
    }
}

export async function sendOtpEmail({ to, purpose = 'login', code = null }) {
    if (!to || !to.includes('@')) {
        throw new Error('Valid recipient email address is required.');
    }

    const otp = code ? String(code) : Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtpToFirebase(to, otp, purpose);

    const actionLabel = purpose === 'login' ? 'Sign In' : (purpose === 'reset' ? 'Password Reset' : 'Account Registration');
    const transporter = getTransporter();
    const sender = process.env.EMAIL_USER || process.env.SMTP_USER || DEFAULT_EMAIL_USER;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Tilux ASM Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 32px 16px; color: #f3f4f6; }
        .card { max-width: 480px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 36px 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .logo { font-size: 24px; font-weight: 800; color: #a855f7; letter-spacing: -0.5px; margin-bottom: 20px; display: inline-block; }
        .badge { background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; display: inline-block; margin-bottom: 16px; }
        h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
        p { font-size: 14px; line-height: 1.6; color: #9ca3af; margin: 0 0 16px 0; }
        .otp-box { background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 12px; padding: 18px 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
        .footer { font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #1f2937; padding-top: 20px; margin-top: 28px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">⚡ Tilux ASM</div>
        <br>
        <span class="badge">Security Verification</span>
        <h1>One-Time Verification Code</h1>
        <p>You requested a one-time verification code for <strong>${actionLabel}</strong> on your Tilux ASM workspace.</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p>This code will expire in <strong>10 minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Tilux ASM &bull; The Autonomous Desktop AI Engine
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
        from: `"Tilux ASM Security" <${sender}>`,
        to: to,
        subject: `${otp} is your Tilux ASM verification code`,
        text: `Your Tilux ASM ${actionLabel} verification code is: ${otp}. It expires in 10 minutes.`,
        html: html
    });

    return {
        success: true,
        otp: otp,
        email: to,
        messageId: info.messageId
    };
}

export async function sendPaymentEmail({
    to,
    status = 'successful',
    amount = 10.0,
    currency = 'USD',
    reference = '',
    gateway = 'Paystack',
    customerName = '',
    reason = ''
}) {
    if (!to || !to.includes('@')) {
        return { success: false, error: 'Valid recipient email required.' };
    }

    const normStatus = (status || 'successful').toLowerCase();
    const isSuccess = normStatus === 'successful' || normStatus === 'success';
    const isPending = normStatus === 'pending' || normStatus === 'processing';
    const isFailed = normStatus === 'failed' || normStatus === 'error' || normStatus === 'reversed';

    let statusTitle = 'Payment Receipt & Wallet Top-Up';
    let statusBadgeText = 'Payment Successful';
    let statusBadgeColor = '#10b981';
    let statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
    let statusIcon = '✓';
    let statusDesc = `Your wallet has been credited with $${Number(amount).toFixed(2)} USD. Your Tilux ASM workspace has instant access to high-speed AI automation.`;

    if (isPending) {
        statusTitle = 'Payment Processing / Pending';
        statusBadgeText = 'Processing Payment';
        statusBadgeColor = '#f59e0b';
        statusBadgeBg = 'rgba(245, 158, 11, 0.15)';
        statusIcon = '⏳';
        statusDesc = `Your transaction of $${Number(amount).toFixed(2)} ${currency} is currently pending confirmation from ${gateway}. Your wallet will be credited automatically once settled.`;
    } else if (isFailed) {
        statusTitle = 'Payment Failed Notice';
        statusBadgeText = 'Payment Unsuccessful';
        statusBadgeColor = '#ef4444';
        statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
        statusIcon = '✕';
        statusDesc = reason 
            ? `Your transaction could not be completed: ${reason}. No funds were deducted.`
            : `Your payment of $${Number(amount).toFixed(2)} ${currency} was not completed. You can re-attempt the transaction anytime from Tilux Settings.`;
    }

    const dateStr = new Date().toUTCString();
    const transporter = getTransporter();
    const sender = process.env.EMAIL_USER || process.env.SMTP_USER || DEFAULT_EMAIL_USER;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${statusTitle}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 32px 16px; color: #f3f4f6; }
        .card { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 36px 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #1f2937; padding-bottom: 16px; }
        .logo { font-size: 22px; font-weight: 800; color: #a855f7; letter-spacing: -0.5px; }
        .receipt-pill { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; color: #9ca3af; background: #1f2937; padding: 4px 10px; border-radius: 6px; }
        .badge { background: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 999px; display: inline-block; margin-bottom: 14px; }
        h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0; }
        p { font-size: 14px; line-height: 1.6; color: #9ca3af; margin: 0 0 20px 0; }
        .table-box { background: #0b0f19; border: 1px solid #1f2937; border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
        .table-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #161f30; font-size: 13px; }
        .table-row:last-child { border-bottom: none; }
        .label { color: #6b7280; font-weight: 500; }
        .value { color: #f3f4f6; font-weight: 600; text-align: right; }
        .value.mono { font-family: 'SFMono-Regular', Consolas, monospace; color: #c084fc; font-size: 12px; }
        .total-row { padding-top: 12px; margin-top: 4px; border-top: 1px dashed #374151 !important; }
        .total-label { color: #ffffff; font-weight: 700; font-size: 15px; }
        .total-value { color: #10b981; font-weight: 800; font-size: 18px; }
        .footer { font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #1f2937; padding-top: 20px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">⚡ Tilux ASM</div>
          <div class="receipt-pill">Official Receipt</div>
        </div>
        <div class="badge">${statusIcon} ${statusBadgeText}</div>
        <h1>${statusTitle}</h1>
        <p>${statusDesc}</p>

        <div class="table-box">
          <div class="table-row">
            <span class="label">Reference ID</span>
            <span class="value mono">${reference || 'N/A'}</span>
          </div>
          <div class="table-row">
            <span class="label">Account Email</span>
            <span class="value">${to}</span>
          </div>
          <div class="table-row">
            <span class="label">Payment Gateway</span>
            <span class="value">${gateway.toUpperCase()}</span>
          </div>
          <div class="table-row">
            <span class="label">Date & Time</span>
            <span class="value">${dateStr}</span>
          </div>
          <div class="table-row total-row">
            <span class="total-label">Amount</span>
            <span class="total-value">$${Number(amount).toFixed(2)} USD</span>
          </div>
        </div>

        <div class="footer">
          This email was automatically generated by Tilux ASM Billing &bull; If you have any questions, contact us via settings or reply directly to this email.
        </div>
      </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Tilux ASM Billing" <${sender}>`,
            to: to,
            subject: `[${statusBadgeText}] Tilux ASM Payment Delivery ($${Number(amount).toFixed(2)} USD) - ${reference.slice(-8)}`,
            text: `Tilux ASM Payment: ${statusBadgeText}. Amount: $${Number(amount).toFixed(2)} USD. Reference: ${reference}. Date: ${dateStr}.`,
            html: html
        });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.warn('[Proxy Mailer] Payment email send notice:', err.message);
        return { success: false, error: err.message };
    }
}
