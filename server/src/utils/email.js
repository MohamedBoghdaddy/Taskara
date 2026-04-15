const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (['development', 'test'].includes(process.env.NODE_ENV)) {
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    return { messageId: `${process.env.NODE_ENV}-mode` };
  }

  const transporter = createTransporter();
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@productivityworkspace.com',
    to,
    subject,
    html,
    text,
  });
};

const sendReminderEmail = async (user, reminder) => {
  return sendEmail({
    to: user.email,
    subject: `Reminder: ${reminder.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366F1;">Productivity Workspace Reminder</h2>
        <h3>${reminder.title}</h3>
        <p>${reminder.message}</p>
        <p style="color: #6B7280; font-size: 14px;">Scheduled for: ${new Date(reminder.remindAt).toLocaleString()}</p>
      </div>
    `,
    text: `Reminder: ${reminder.title}\n${reminder.message}`,
  });
};

module.exports = { sendEmail, sendReminderEmail };
