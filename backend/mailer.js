/**
 * mailer.js — NexINV email service
 * Uses nodemailer with any SMTP provider (Gmail, Brevo, Mailgun, etc.)
 *
 * Required .env vars:
 *   SMTP_HOST    e.g. smtp.gmail.com
 *   SMTP_PORT    e.g. 587
 *   SMTP_SECURE  true | false  (true for port 465)
 *   SMTP_USER    your@email.com
 *   SMTP_PASS    app password or SMTP password
 *   SMTP_FROM    "NexINV" <noreply@nexinv.app>   (optional, defaults to SMTP_USER)
 */

const nodemailer = require('nodemailer');

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.SMTP_FROM || `"NexINV" <${process.env.SMTP_USER || 'noreply@nexinv.app'}>`;

/* ── Welcome email on company registration ─────────────────────────────────── */
async function sendWelcome({ to, adminName, companyName, companyCode }) {
  if (!to || !to.includes('@')) return; // no valid email — skip silently

  if (!isConfigured) {
    console.log(`📧 [MAIL SKIPPED] SMTP not configured.`);
    console.log(`   Would send welcome to: ${to}`);
    console.log(`   Company: ${companyName}  |  Code: ${companyCode}`);
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to NexINV</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 16px 40px; }
    .card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 36px 40px; text-align: center; }
    .logo-box { display: inline-flex; align-items: center; gap: 12px; background: rgba(255,255,255,.15); border-radius: 12px; padding: 10px 20px; margin-bottom: 20px; }
    .logo-icon { width: 36px; height: 36px; background: rgba(255,255,255,.25); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .logo-text { color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -.5px; }
    .header h1 { color: #fff; font-size: 26px; font-weight: 800; line-height: 1.2; }
    .header p  { color: rgba(255,255,255,.85); font-size: 14px; margin-top: 8px; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
    .text { font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 24px; }
    .code-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
    .code-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 10px; }
    .code { font-size: 36px; font-weight: 900; font-family: 'Courier New', monospace; color: #3b82f6; letter-spacing: 4px; }
    .code-note { font-size: 12px; color: #94a3b8; margin-top: 10px; }
    .btn { display: block; width: 100%; background: #3b82f6; color: #fff !important; text-decoration: none; text-align: center; padding: 14px; border-radius: 10px; font-size: 15px; font-weight: 700; margin: 24px 0 0; }
    .divider { border: none; border-top: 1px solid #f1f5f9; margin: 28px 0; }
    .features { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
    .feat { background: #f8fafc; border-radius: 10px; padding: 14px; }
    .feat-icon { font-size: 20px; margin-bottom: 6px; }
    .feat-title { font-size: 13px; font-weight: 700; color: #1e293b; }
    .feat-desc  { font-size: 12px; color: #64748b; margin-top: 2px; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; line-height: 1.6; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <!-- Header -->
    <div class="header">
      <div class="logo-box">
        <div class="logo-icon">📦</div>
        <div class="logo-text">NexINV</div>
      </div>
      <h1>Welcome to the family, ${companyName}!</h1>
      <p>Your workspace is ready — let's get started.</p>
    </div>

    <!-- Body -->
    <div class="body">
      <p class="greeting">Hi ${adminName} 👋</p>
      <p class="text">
        We're thrilled to have <strong>${companyName}</strong> join the NexINV platform.
        Your company workspace has been set up and is ready to use right now.
        Below is your unique company code — keep it safe and share it with your
        team members so they can log in to your workspace.
      </p>

      <!-- Code box -->
      <div class="code-box">
        <div class="code-label">Your Company Code</div>
        <div class="code">${companyCode}</div>
        <div class="code-note">Share this code with your team. They'll need it to log in.</div>
      </div>

      <!-- Features -->
      <div class="features">
        <div class="feat">
          <div class="feat-icon">📊</div>
          <div class="feat-title">Inventory Tracking</div>
          <div class="feat-desc">Real-time stock levels with alerts</div>
        </div>
        <div class="feat">
          <div class="feat-icon">🔄</div>
          <div class="feat-title">Transactions</div>
          <div class="feat-desc">Track every stock movement</div>
        </div>
        <div class="feat">
          <div class="feat-icon">👥</div>
          <div class="feat-title">Team Management</div>
          <div class="feat-desc">Role-based access control</div>
        </div>
        <div class="feat">
          <div class="feat-icon">🤖</div>
          <div class="feat-title">AI Insights</div>
          <div class="feat-desc">Smart recommendations for you</div>
        </div>
      </div>

      <hr class="divider" />

      <p class="text">
        To get started, log in using your company code <strong>${companyCode}</strong>,
        your username <strong>${adminName.toLowerCase()}</strong>, and the password you set during registration.
      </p>

      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/#login" class="btn">
        → Log in to your workspace
      </a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        This email was sent to <strong>${to}</strong> because you created a NexINV workspace.<br/>
        If this wasn't you, you can safely ignore this email.<br/>
        © ${new Date().getFullYear()} NexINV SaaS. All rights reserved.
      </p>
    </div>
  </div>
</div>
</body>
</html>`;

  await transporter.sendMail({
    from:    FROM,
    to,
    subject: `🎉 Welcome to NexINV — your company code is ${companyCode}`,
    html,
    text: `Welcome to NexINV, ${adminName}!\n\nYour company "${companyName}" is ready.\nYour company code: ${companyCode}\n\nLog in at: ${process.env.CLIENT_URL || 'http://localhost:5173'}/#login`,
  });

  console.log(`📧 Welcome email sent → ${to}`);
}

module.exports = { sendWelcome };
