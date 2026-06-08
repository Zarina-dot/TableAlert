// controllers/authController.js
const { sendEmailNotification } = require('../services/emailService');

const verificationCodes = {}; // email -> code
const ADMIN_EMAIL = '6lil6zi6@gmail.com';   // ← админский email

exports.sendCode = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email обязателен' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[email] = code;
 // Отправляем письмо в фоне, не дожидаясь ответа
sendEmailNotification({
  to: email,
  subject: 'Код подтверждения TableAlert',
  html: `<p>Ваш код подтверждения: <strong>${code}</strong></p>`,
}).catch(console.error); // ошибку логируем, но не блокируем ответ
res.json({ message: 'Код отправлен (смотрите консоль сервера)' });
}
exports.verifyCode = (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email и код обязательны' });
  if (verificationCodes[email] === code) {
    req.session.userEmail = email;
    req.session.isAdmin = (email === ADMIN_EMAIL);   // ← флаг админа
    delete verificationCodes[email];
    res.json({ message: 'Вход выполнен', email });
  } else {
    res.status(401).json({ error: 'Неверный код' });
  }
};

exports.me = (req, res) => {
  if (req.session.userEmail) {
    res.json({ 
      email: req.session.userEmail,
      isAdmin: req.session.isAdmin || false 
    });
  } else {
    res.status(401).json({ error: 'Не авторизован' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Ошибка выхода' });
    res.json({ message: 'Выход выполнен' });
  });
};