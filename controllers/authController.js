const { sendEmailNotification } = require('../services/emailService');

const verificationCodes = {}; // email -> code

// Отправка кода на email
exports.sendCode = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email обязателен' });
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes[email] = code;

  // Реальная отправка письма с кодом
  await sendEmailNotification({
    to: email,
    subject: 'Код подтверждения TableAlert',
    html: `<p>Ваш код подтверждения: <strong>${code}</strong></p>
           <p>Введите его на сайте для входа.</p>`,
  });

  res.json({ message: 'Код отправлен на указанный email' });
};

// Проверка кода и вход
exports.verifyCode = (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email и код обязательны' });
  }
  if (verificationCodes[email] === code) {
    req.session.userEmail = email;
    delete verificationCodes[email];
    res.json({ message: 'Вход выполнен', email });
  } else {
    res.status(401).json({ error: 'Неверный код' });
  }
};

// Получить текущего пользователя
exports.me = (req, res) => {
  if (req.session.userEmail) {
    res.json({ email: req.session.userEmail });
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