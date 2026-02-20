const nodemailer = require('nodemailer');

// Use ethereal for dev (no real emails sent). Replace with real SMTP in production.
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;
  // Create a test account on the fly
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return transporter;
}

async function sendTicketEmail(toEmail, subject, htmlBody) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"Club Council" <noreply@clubcouncil.com>',
      to: toEmail,
      subject,
      html: htmlBody,
    });
    console.log('Email sent:', nodemailer.getTestMessageUrl(info));
    return info;
  } catch (err) {
    console.error('Email send error:', err);
  }
}

module.exports = { sendTicketEmail };
