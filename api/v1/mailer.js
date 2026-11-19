import nodemailer from 'nodemailer';

const DEFAULT_EMAIL_USER = 'tilux001@gmail.com';
const DEFAULT_EMAIL_PASS = 'worntpimvltcaeyj';
const TILUX_LOGO_BASE64 = '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';



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
<table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                    <tr>
                      <td style="vertical-align: middle; padding-right: 8px;">
                        <img src="cid:tilux_logo" width="24" height="24" style="display: block; width: 24px; height: 24px; border-radius: 5px; object-fit: contain;" alt="Tilux" />
                      </td>
                      <td style="vertical-align: middle; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                        Tilux
                      </td>
                    </tr>
                  </table>
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
        html: html,
        attachments: [
            {
                filename: 'icon.png',
                content: Buffer.from(TILUX_LOGO_BASE64, 'base64'),
                cid: 'tilux_logo'
            }
        ]
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
<table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px;">
                    <tr>
                      <td style="vertical-align: middle; padding-right: 8px;">
                        <img src="cid:tilux_logo" width="24" height="24" style="display: block; width: 24px; height: 24px; border-radius: 5px; object-fit: contain;" alt="Tilux" />
                      </td>
                      <td style="vertical-align: middle; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                        Tilux
                      </td>
                    </tr>
                  </table>
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
            html: html,
            attachments: [
                {
                    filename: 'icon.png',
                    content: Buffer.from(TILUX_LOGO_BASE64, 'base64'),
                    cid: 'tilux_logo'
                }
            ]
        });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.warn('[Proxy Mailer] Payment email send notice:', err.message);
        return { success: false, error: err.message };
    }
}
