const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Use real SMTP if configured, otherwise fall back to Ethereal
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Using configured SMTP:', process.env.SMTP_HOST);
  } else {
    // Fallback to Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('Using Ethereal test email (emails not delivered to real inboxes)');
  }
  return transporter;
}

function buildTicketEmailHtml({ eventTitle, ticketId, eventDate, venue, participantName, qrDataUrl, extras }) {
  const extraRows = extras ? extras.map(e => `<tr><td style="padding:6px 12px;font-weight:600;color:#555;">${e.label}</td><td style="padding:6px 12px;">${e.value}</td></tr>`).join('') : '';
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:2px solid #333;border-radius:12px;overflow:hidden;">
      <div style="background:#333;color:#fff;padding:16px 20px;text-align:center;">
        <h2 style="margin:0;">Event Ticket</h2>
      </div>
      <div style="padding:20px;">
        <div style="text-align:center;margin-bottom:16px;">
          ${qrDataUrl ? `<img src="cid:qrcode" alt="QR Code" style="width:180px;height:180px;" />` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Event</td><td style="padding:6px 12px;">${eventTitle}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Ticket ID</td><td style="padding:6px 12px;font-family:monospace;font-size:12px;">${ticketId}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Participant</td><td style="padding:6px 12px;">${participantName}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Date</td><td style="padding:6px 12px;">${eventDate}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:600;color:#555;">Venue</td><td style="padding:6px 12px;">${venue}</td></tr>
          ${extraRows}
        </table>
      </div>
      <div style="background:#f5f5f5;padding:12px 20px;text-align:center;font-size:12px;color:#888;">
        Please present this ticket (QR code) at the venue for entry.
      </div>
    </div>
  `;
}

async function sendTicketEmail(toEmail, subject, htmlBody, qrDataUrl) {
  try {
    const t = await getTransporter();
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Club Council'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@clubcouncil.com'}>`,
      to: toEmail,
      subject,
      html: htmlBody,
    };

    // Attach QR code as inline image if provided
    if (qrDataUrl) {
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      mailOptions.attachments = [{
        filename: 'qrcode.png',
        content: base64Data,
        encoding: 'base64',
        cid: 'qrcode',
      }];
    }

    const info = await t.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Email preview URL:', previewUrl);
    } else {
      console.log('Email sent to:', toEmail, '| MessageId:', info.messageId);
    }
    return info;
  } catch (err) {
    console.error('Email send error:', err);
  }
}

module.exports = { sendTicketEmail, buildTicketEmailHtml };
