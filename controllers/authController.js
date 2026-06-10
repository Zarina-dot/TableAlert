// controllers/authController.js
const { sendEmailNotification } = require('../services/emailService');

const verificationCodes = {}; // email -> code
const ADMIN_EMAIL = '6lil6zi6@gmail.com'; // замените на свой email, если нужно

// Отправка кода на email (реальная отправка)
exports.sendCode = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email обязателен' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[email] = code;

  try {
    await sendEmailNotification({
      to: email,
      subject: 'Код подтверждения TableAlert',
      html: `<p>Ваш код подтверждения: <strong>${code}</strong></p>
             <p>Введите этот код на сайте для входа.</p>`,
    });
    console.log(`Код для ${email} отправлен на почту: ${code}`);
    res.json({ message: 'Код отправлен на указанный email' });
  } catch (error) {
    console.error('Ошибка отправки письма:', error);
    res.status(500).json({ error: 'Не удалось отправить код. Попробуйте позже.' });
  }
};

// Проверка кода и вход
exports.verifyCode = (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email и код обязательны' });
  }
  if (verificationCodes[email] === code) {
    req.session.userEmail = email;
    req.session.isAdmin = (email === ADMIN_EMAIL);
    delete verificationCodes[email];
    res.json({ message: 'Вход выполнен', email });
  } else {
    res.status(401).json({ error: 'Неверный код' });
  }
};

// Получить текущего пользователя
exports.me = (req, res) => {
  if (req.session.userEmail) {
    res.json({ email: req.session.userEmail, isAdmin: req.session.isAdmin || false });
  } else {
    res.status(401).json({ error: 'Не авторизован' });
  }
};

// Выход
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка выхода' });
    }
    res.json({ message: 'Выход выполнен' });
  });
};