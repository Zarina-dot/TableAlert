const nodemailer = require('nodemailer');

// Настройте реальные данные своего SMTP-сервера
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true для 465, false для 587
  auth: {
    user: '6lil6zi6@@gmail.com',   // замените на свой email
    pass: 'nnkdwypxymmfkbgb',       // замените на пароль приложения
  },
});

exports.sendEmailNotification = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: '"TableAlert" <your-email@gmail.com>', // замените
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};