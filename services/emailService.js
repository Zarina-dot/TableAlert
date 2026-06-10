const nodemailer = require('nodemailer');

// Настройка транспорта для отправки email через Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true для 465, false для 587
  auth: {
    user: process.env.EMAIL_USER || '6lil6zi6@gmail.com',   // ваш email
    pass: process.env.EMAIL_PASS || 'nnkdwypxymmfkbgb', // пароль приложения Gmail
  },
});

// Функция отправки письма
exports.sendEmailNotification = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"TableAlert" <${process.env.EMAIL_USER || '6lil6zi6@gmail.com'}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error; // пробрасываем ошибку дальше, чтобы вызывающий код мог её обработать
  }
};