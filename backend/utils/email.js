const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Club Council <noreply@clubcouncil.com>';

function buildTicketEmailHtml({ eventTitle, ticketId, eventDate, venue, participantName, qrDataUrl, extras }) {
  const extraRows = extras ? extras.map(e => `<tr><td style="padding:6px 12px;font-weight:600;color:#555;">${e.label}</td><td style="padding:6px 12px;">${e.value}</td></tr>`).join('') : '';
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:2px solid #333;border-radius:12px;overflow:hidden;">
      <div style="background:#333;color:#fff;padding:16px 20px;text-align:center;">
        <h2 style="margin:0;">Event Ticket</h2>
      </div>
      <div style="padding:20px;">
        <div style="text-align:center;margin-bottom:16px;">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" style="width:180px;height:180px;" />` : ''}
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
    const emailOptions = {
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html: htmlBody,
    };

    // Attach QR code as an attachment if provided
    if (qrDataUrl) {
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      emailOptions.attachments = [{
        filename: 'qrcode.png',
        content: Buffer.from(base64Data, 'base64'),
      }];
    }

    const { data, error } = await resend.emails.send(emailOptions);
    if (error) {
      console.error('Resend email error:', error);
      return null;
    }
    console.log('Email sent to:', toEmail, '| Id:', data.id);
    return data;
  } catch (err) {
    console.error('Email send error:', err);
  }
}

module.exports = { sendTicketEmail, buildTicketEmailHtml };
