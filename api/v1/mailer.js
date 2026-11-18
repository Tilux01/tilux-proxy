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
            try { await fetch(url, { method: 'DELETE' }); } catch (_) {}
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

    const digits = otp.split('');
    const digitCells = digits.map(d => `<td align="center" width="46" height="52" style="background: #141122; border: 1px solid rgba(168, 85, 247, 0.45); border-radius: 12px; font-size: 28px; font-weight: 800; color: #ffffff; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.20);">${d}</td>`).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Tilux Verification Code</title>
    </head>
    <body style="margin: 0; padding: 32px 12px; background-color: #07060a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07060a;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #0c0a12; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(124, 58, 237, 0.18);">
              <!-- Hero Banner Matching Desktop Auth Modal -->
              <tr>
                <td style="background: linear-gradient(145deg, #a855f7 0%, #7c3aed 40%, #3b0764 75%, #0f0728 100%); padding: 36px 30px; border-radius: 24px; margin: 8px;">
                  <div style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin-bottom: 22px;">
                    <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 4px 8px; margin-right: 6px;">⚡</span> Tilux
                  </div>
                  <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Get Started with Us</h1>
                  <p style="margin: 0 0 24px 0; font-size: 13px; color: rgba(255, 255, 255, 0.80); line-height: 1.5; max-width: 380px;">
                    Complete these easy steps to register your desktop AI account.
                  </p>
                  <!-- Auth Step Pills -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding-bottom: 8px;">
                        <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.75);">
                          <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.20); color: #ffffff; text-align: center; line-height: 18px; font-size: 10px; font-weight: 700; margin-right: 8px;">1</span>
                          Sign up your account
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 8px;">
                        <div style="background: #ffffff; border: 1px solid #ffffff; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 700; color: #000000; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);">
                          <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #000000; color: #ffffff; text-align: center; line-height: 18px; font-size: 10px; font-weight: 700; margin-right: 8px;">2</span>
                          Verify email code &nbsp;<span style="background: #a855f7; color: #ffffff; font-size: 10px; padding: 2px 7px; border-radius: 999px; font-weight: 600;">CURRENT</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.75);">
                          <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.20); color: #ffffff; text-align: center; line-height: 18px; font-size: 10px; font-weight: 700; margin-right: 8px;">3</span>
                          Set up your workspace
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Form Body Area -->
              <tr>
                <td style="padding: 34px 30px;">
                  <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Verification Code</h2>
                  <p style="margin: 0 0 22px 0; font-size: 14px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                    Enter this 6-digit one-time code to complete your security verification for <strong style="color: #ffffff;">${actionLabel}</strong>:
                  </p>

                  <!-- 6 Capsules Table -->
                  <table align="center" border="0" cellspacing="6" cellpadding="0" style="margin: 20px auto;">
                    <tr>
                      ${digitCells}
                    </tr>
                  </table>

                  <!-- Pill Badge Timer -->
                  <table align="center" border="0" cellspacing="0" cellpadding="0" style="margin: 18px auto 24px auto;">
                    <tr>
                      <td align="center">
                        <div style="display: inline-block; background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: #c084fc;">
                          ⏱ Code expires in 10 minutes
                        </div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 16px 0; font-size: 12px; color: rgba(255, 255, 255, 0.45); line-height: 1.5; text-align: center;">
                    If you did not request this verification code, please ignore this email or check your workspace security settings.
                  </p>

                  <div style="height: 1px; background: rgba(255, 255, 255, 0.08); margin: 24px 0 18px 0;"></div>

                  <div style="font-size: 11px; color: rgba(255, 255, 255, 0.35); text-align: center; line-height: 1.6;">
                    Tilux ASM &bull; The Autonomous Desktop AI Assistant<br>
                    Protected with 256-bit encryption &bull; Real-time AI Automation
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${statusTitle}</title>
    </head>
    <body style="margin: 0; padding: 32px 12px; background-color: #07060a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07060a;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #0c0a12; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 28px; overflow: hidden; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(124, 58, 237, 0.18);">
              <!-- Hero Banner Matching Desktop Auth Modal -->
              <tr>
                <td style="background: linear-gradient(145deg, #a855f7 0%, #7c3aed 40%, #3b0764 75%, #0f0728 100%); padding: 36px 30px; border-radius: 24px; margin: 8px;">
                  <div style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin-bottom: 22px;">
                    <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 4px 8px; margin-right: 6px;">⚡</span> Tilux
                  </div>
                  <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Tilux AI Subscription & Billing</h1>
                  <p style="margin: 0 0 24px 0; font-size: 13px; color: rgba(255, 255, 255, 0.80); line-height: 1.5; max-width: 380px;">
                    Autonomous AI Execution & High-Speed Token Top-Up.
                  </p>
                  <!-- Step Pills -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="padding-bottom: 8px;">
                        <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.75);">
                          <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.20); color: #ffffff; text-align: center; line-height: 18px; font-size: 10px; font-weight: 700; margin-right: 8px;">1</span>
                          Select Amount & Gateway
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 8px;">
                        <div style="background: #ffffff; border: 1px solid #ffffff; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 700; color: #000000; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);">
                          <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #000000; color: #ffffff; text-align: center; line-height: 18px; font-size: 10px; font-weight: 700; margin-right: 8px;">2</span>
                          Process Payment &nbsp;<span style="background: #a855f7; color: #ffffff; font-size: 10px; padding: 2px 7px; border-radius: 999px; font-weight: 600;">RECEIPT</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.10); border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.75);">
                          <span style="display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.20); color: #ffffff; text-align: center; line-height: 18px; font-size: 10px; font-weight: 700; margin-right: 8px;">3</span>
                          Instant AI Activation
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Receipt Form Body Area -->
              <tr>
                <td style="padding: 34px 30px;">
                  <!-- Status Pill Badge -->
                  <div style="display: inline-block; background: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 999px; margin-bottom: 16px;">
                    ${statusIcon} ${statusBadgeText}
                  </div>

                  <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">${statusTitle}</h2>
                  <p style="margin: 0 0 24px 0; font-size: 14px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                    ${statusDesc}
                  </p>

                  <!-- Breakdown Table -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #141122; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 18px 20px; margin: 20px 0;">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; color: rgba(255, 255, 255, 0.50);">Reference ID</td>
                      <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; font-weight: 600; font-family: 'SFMono-Regular', Consolas, monospace; color: #c084fc;">${reference || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; color: rgba(255, 255, 255, 0.50);">Account Email</td>
                      <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; font-weight: 600; color: #ffffff;">${to}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; color: rgba(255, 255, 255, 0.50);">Gateway</td>
                      <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; font-weight: 600; color: #ffffff;">${gateway.toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 13px; color: rgba(255, 255, 255, 0.50);">Date & Time</td>
                      <td align="right" style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: rgba(255, 255, 255, 0.70);">${dateStr}</td>
                    </tr>
                    <tr>
                      <td style="padding-top: 14px; font-size: 15px; font-weight: 700; color: #ffffff;">Total Amount</td>
                      <td align="right" style="padding-top: 14px; font-size: 18px; font-weight: 800; color: ${statusBadgeColor};">$${Number(amount).toFixed(2)} USD</td>
                    </tr>
                  </table>

                  <div style="height: 1px; background: rgba(255, 255, 255, 0.08); margin: 24px 0 18px 0;"></div>

                  <div style="font-size: 11px; color: rgba(255, 255, 255, 0.35); text-align: center; line-height: 1.6;">
                    Tilux ASM &bull; The Autonomous Desktop AI Assistant &bull; Official Delivery Receipt<br>
                    Questions? Manage your subscription in Tilux Settings.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
